import functions_framework
import base64
import io
import os
import numpy as np
from PIL import Image

from google.cloud import aiplatform, storage, firestore
import pydicom
from pydicom.filebase import DicomBytesIO

# Initialize clients globally to reuse connections across function invocations
# This is a best practice for performance and efficiency.
storage_client = storage.Client()
firestore_client = firestore.Client(database="rad-assist-firestore")
aiplatform.init(project=os.environ.get("GCP_PROJECT"), location=os.environ.get("GCP_REGION"))

@functions_framework.cloud_event
def process_dicom_and_index(cloud_event):
    """
    This function is triggered by a GCS file upload. It reads a DICOM file,
    generates an embedding using Vertex AI's MedSigLIP model, and stores
    that embedding in Firestore for semantic search.
    """
    data = cloud_event.data
    bucket_name = data["bucket"]
    file_name = data["name"]
    
    print(f"Processing file: {file_name} from bucket: {bucket_name}.")

    # --- 1. Read DICOM file directly from GCS into memory ---
    try:
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(file_name)
        dicom_bytes = blob.download_as_bytes()
        
        # Use DicomBytesIO to allow pydicom to read the file from memory [1]
        dicom_file = pydicom.dcmread(DicomBytesIO(dicom_bytes))
        print("Successfully parsed DICOM file from GCS.")
        
        # Extract necessary DICOM tags for Firestore path
        patient_id = dicom_file.PatientID
        study_uid = dicom_file.StudyInstanceUID
        slice_uid = dicom_file.SOPInstanceUID
        
    except Exception as e:
        print(f"Error reading or parsing DICOM file: {e}")
        return

    # --- 2. Pre-process the image for the MedSigLIP model ---
    pixel_array = dicom_file.pixel_array.astype(float)
    rescaled_image = (np.maximum(pixel_array, 0) / pixel_array.max()) * 255.0
    final_image = np.uint8(rescaled_image)
    image = Image.fromarray(final_image).convert("RGB")
    
    # Convert image to Base64 string for the API request
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
    print("Successfully pre-processed image for Vertex AI.")

    # --- 3. Call MedSigLIP Endpoint ---
    try:
        endpoint_id = os.environ.get("ENDPOINT_ID")
        endpoint = aiplatform.Endpoint(endpoint_name=endpoint_id)
        
        # The payload must be structured exactly as the model expects
        instances = [{"image": {"input_bytes": img_str}}]
        
        prediction = endpoint.predict(instances=instances)
        print(f"Successfully received prediction {prediction}")
        
        # Extract the embedding vector from the prediction response
        embedding = prediction.predictions[0]['embedding']
        print(f"Successfully received embedding of size {len(embedding)}.")

    except Exception as e:
        print(f"Error calling Vertex AI endpoint: {e}")
        return

    # --- 4. Store the Embedding in Firestore ---
    try:
        # Construct the hierarchical document path for efficient querying
        doc_ref = firestore_client.collection('patients').document(patient_id) \
                                 .collection('studies').document(study_uid) \
                                 .collection('slices').document(slice_uid)
        
        # Set the data for the document
        doc_ref.set({
            'embedding': embedding,
            'gcsPath': f"gs://{bucket_name}/{file_name}",
            'sliceNumber': int(dicom_file.InstanceNumber) if 'InstanceNumber' in dicom_file else None
        })
        print(f"Successfully stored embedding in Firestore at path: {doc_ref.path}")

    except Exception as e:
        print(f"Error storing embedding in Firestore: {e}")
        return
