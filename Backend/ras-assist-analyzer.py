import functions_framework
import base64
import io
import os
import numpy as np
from PIL import Image

from google.cloud import aiplatform, storage, firestore
import pydicom
from pydicom.filebase import DicomBytesIO

# Import the specific Vertex AI SDKs needed
import vertexai
from vertexai.generative_models import GenerativeModel

# --- GLOBAL INITIALIZATION ---
# Initialize clients and models once to be reused across invocations
storage_client = storage.Client()
firestore_client = firestore.Client()

# Initialize Vertex AI with project and location from environment variables
PROJECT_ID = os.environ.get("GCP_PROJECT", "")
REGION = os.environ.get("GCP_REGION", "us-central1")
vertexai.init(project=PROJECT_ID, location=REGION)

# Instantiate the generative model client for report generation
llm_model = GenerativeModel("gemini-1.5-flash-001")

# --- MAIN HTTP FUNCTION ---
@functions_framework.http
def get_analysis(request):
    """
    HTTP Cloud Function that orchestrates a multi-stage AI pipeline to assist radiologists.
    It receives GCS paths for two DICOM files, performs guided segmentation,
    quantitative analysis, and generates a draft report.
    """
    # Set CORS headers to allow requests from your web app
    headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
    if request.method == 'OPTIONS':
        return ('', 204, headers)

    try:
        request_json = request.get_json(silent=True)
        gcs_uri_before = request_json['gcsUriBefore']
        gcs_uri_after = request_json['gcsUriAfter']
        print(f"Received request for pre: {gcs_uri_before} and post: {gcs_uri_after}")
    except (TypeError, KeyError) as e:
        error_msg = "Invalid request format. Expecting {'gcsUriBefore': '...', 'gcsUriAfter': '...'}"
        print(f"Error parsing request: {e}")
        return ({"error": error_msg}, 400, headers)

    try:
        # --- STAGE 1: Observation & Analysis (Segmentation & Sizing) ---
        # For the demo, we use hardcoded coordinates as a "hint" for the AI.
        # These would be derived from the expert segmentation in a full implementation.
        # TODO: Replace with coordinates for your chosen demo patient (e.g., HCC_002)
        HINT_COORDINATE_BEFORE =  [0,0]
        HINT_COORDINATE_AFTER =   [0,0]

        area_before, mask_coords_before = segment_with_sam(gcs_uri_before, HINT_COORDINATE_BEFORE)
        area_after, mask_coords_after = segment_with_sam(gcs_uri_after, HINT_COORDINATE_AFTER)

        # --- STAGE 2: Quantitative Findings (Prediction & Classification) ---
        similarity_score = get_embedding_similarity(gcs_uri_before, gcs_uri_after)
        
        if area_before > 0:
            percentage_change = ((area_after - area_before) / area_before) * 100
        else:
            percentage_change = 0.0

        recist_category = classify_recist_response(percentage_change)

        # --- STAGE 3: Generative Reporting ---
        analysis_data = {
            "preTreatmentArea": area_before,
            "postTreatmentArea": area_after,
            "percentageChange": round(percentage_change, 2),
            "recistCategory": recist_category,
            "similarityScore": round(similarity_score, 4) if similarity_score else None,
        }
        draft_report = generate_draft_report(analysis_data)

        # --- FINAL RESPONSE ---
        response_data = {
            **analysis_data,
            "segmentationMaskBefore": mask_coords_before,
            "segmentationMaskAfter": mask_coords_after,
            "draftReport": draft_report
        }
        
        print("Full analysis complete.")
        return (response_data, 200, headers)

    except Exception as e:
        print(f"An unexpected error occurred during the analysis pipeline: {e}")
        return ({"error": f"Analysis pipeline failed: {e}"}, 500, headers)

# --- HELPER FUNCTIONS ---

def segment_with_sam(gcs_uri, hint_coordinate):
    """Reads a DICOM from GCS, calls the SAM model with a point prompt, and returns the area."""
    print(f"Starting SAM segmentation for {gcs_uri} with hint at {hint_coordinate}...")
    
    bucket_name, file_name = gcs_uri.replace("gs://", "").split("/", 1)
    blob = storage_client.bucket(bucket_name).blob(file_name)
    image_bytes = blob.download_as_bytes()
    encoded_content = base64.b64encode(image_bytes).decode("utf-8")
    
    endpoint_id = os.environ.get("SAM_ENDPOINT_ID")
    endpoint = aiplatform.Endpoint(endpoint_name=endpoint_id)

    instances = [{"image_bytes": {"b64": encoded_content}, "point_prompt": [hint_coordinate]}]
    
    prediction = endpoint.predict(instances=instances)
    
    masks = prediction.predictions
    if not masks:
        print("No masks found by SAM model.")
        return 0,

    # The mask is a run-length encoded (RLE) string. We need to decode it.
    # The format is [height, width, rle_string]
    mask_areas = []
    for mask_data in masks:
        rle_string = mask_data['mask']
        # The sum of every second number in the RLE string is the pixel area.
        area = sum(map(int, rle_string.split(' ')[1::2]))
        mask_areas.append((area, rle_string)) # Store area and the mask data

    if not mask_areas:
        return 0,
        
    # With a point prompt, we expect the largest returned mask to be the correct one.
    best_mask = max(mask_areas, key=lambda item: item)
    pixel_area = best_mask
    
    print(f"SAM returned {len(mask_areas)} masks. Selected largest with area: {pixel_area} pixels.")
    # For the demo, we only need the area, but returning the mask data is good practice.
    return pixel_area, best_mask[1]

def get_embedding_similarity(gcs_uri_before, gcs_uri_after):
    """Retrieves MedSigLIP embeddings from Firestore and calculates cosine similarity."""
    print("Retrieving embeddings from Firestore...")
    
    def get_embedding(gcs_uri):
        ds = pydicom.dcmread(io.BytesIO(storage_client.bucket(gcs_uri.split('/')[2]).blob("/".join(gcs_uri.split('/')[3:])).download_as_bytes()), stop_before_pixels=True)
        doc_ref = firestore_client.collection('patients').document(ds.PatientID) \
                                .collection('studies').document(ds.StudyInstanceUID) \
                                .collection('slices').document(ds.SOPInstanceUID)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict().get('embedding')
        return None

    embedding_before = get_embedding(gcs_uri_before)
    embedding_after = get_embedding(gcs_uri_after)

    if not embedding_before or not embedding_after:
        print("Could not retrieve one or both embeddings from Firestore.")
        return None

    # Calculate Cosine Similarity
    vec_before = np.array(embedding_before)
    vec_after = np.array(embedding_after)
    dot_product = np.dot(vec_before, vec_after)
    norm_product = np.linalg.norm(vec_before) * np.linalg.norm(vec_after)
    
    return dot_product / norm_product

def classify_recist_response(percentage_change):
    """Applies simplified RECIST 1.1 logic to classify tumor response."""
    if percentage_change <= -30:
        return "Partial Response (PR)"
    elif percentage_change >= 20:
        return "Progressive Disease (PD)"
    else:
        return "Stable Disease (SD)"

def generate_draft_report(data):
    """Calls a generative LLM to create a draft radiology report."""
    print("Generating draft report with LLM...")
    
    prompt = f"""
    You are a helpful radiology assistant. Based on the following structured data from an AI analysis of a patient with Hepatocellular Carcinoma (HCC) treated with TACE, generate a concise 'FINDINGS' and 'IMPRESSION' section for a radiology report.

    **Data:**
    - Baseline Tumor Area: {data} pixels
    - Follow-up Tumor Area: {data} pixels
    - Percentage Change: {data['percentageChange']}%
    - RECIST 1.1 Category: {data['recistCategory']}
    - Phenotypic Similarity Score (MedSigLIP): {data}

    **Instructions:**
    1.  In the FINDINGS section, state the quantitative changes observed.
    2.  In the IMPRESSION section, summarize the findings and state the RECIST 1.1 classification.
    3.  Maintain a professional, clinical tone.

    **Generate the report:**
    """
    
    try:
        response = llm_model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling LLM: {e}")
        return "Report generation failed."
