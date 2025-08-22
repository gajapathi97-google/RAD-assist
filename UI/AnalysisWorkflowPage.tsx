import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Segment, ChatMessage } from '../../types';
import Chatbot from '../Chatbot';
import ImageAnalysis from '../ImageAnalysis';
import ProgressBar from '../ProgressBar';
import AnalysisLoader from '../AnalysisLoader';


const initialSegments: Segment[] = [
  {
    "id": "lesion1",
    "name": "Segment 1",
    "color": "#ef4444",
    "position": { "top": "30%", "left": "10%", "width": "40%", "height": "40%" },
    "svgViewBox": "0 0 100 100",
    "pathData": "M 10 40 C 20 0, 80 0, 90 30 S 70 85, 40 80 C 20 70, 5 55, 10 40 z",
    "size": "5.5 cm",
    "note": "Irregularly shaped mass with heterogeneous arterial enhancement and early washout, suggestive of HCC.",
    "confirmed": false,
    "postTreatment": {
      "pathData": "M 25 45 C 35 15, 75 15, 80 40 S 70 75, 50 70 C 35 65, 20 55, 25 45 z",
      "size": "Residual: 4.0 cm",
      "dimensions": "4.0 cm x 3.8 cm x 4.2 cm",
      "note": "Significant reduction in size and enhancement post-TACE, with evidence of central necrosis and peripheral residual viable tissue."
    }
  },
  {
    id: 'lesion2',
    name: 'Segment 2',
    color: '#f59e0b',
    position: { top: '55%', left: '70%', width: '15%', height: '15%' },
    svgViewBox: '0 0 50 50',
    pathData: 'M 25 10 A 15 15 0 1 1 24.9 40 A 15 15 0 1 1 25 10 z',
    size: '1.8 cm x 1.7 cm',
    note: 'Small, well-circumscribed lesion with uniform enhancement. Consider benign etiology vs. small HCC.',
    confirmed: false,
    postTreatment: {
      pathData: 'M 25 25 a 2 2 0 1 1 4 0 a 2 2 0 1 1 -4 0',
      size: 'Complete response',
      dimensions: 'N/A',
      note: 'No significant residual enhancement, indicating complete response.'
    }
  },
];

const AnalysisWorkflowPage = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [view, setView] = useState<'upload' | 'analyzing' | 'analysis'>('upload');
  const [uploadedPreScan, setUploadedPreScan] = useState<string | null>(null);
  const [uploadedPostScan, setUploadedPostScan] = useState<string | null>(null);

  const preScanInputRef = useRef<HTMLInputElement>(null);
  const postScanInputRef = useRef<HTMLInputElement>(null);

  const [activeScan, setActiveScan] = useState<'pre' | 'post'>('pre');

  const [segments, setSegments] = useState<Segment[]>(initialSegments);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { id: 1, sender: 'bot', text: "Welcome! Please provide the pre- and post-treatment scans for analysis." }
  ]);
  const [confirmedTumors, setConfirmedTumors] = useState(0);

  const addChatMessage = (text: string, sender: 'bot' | 'system' | 'user' = 'system') => {
    setChatMessages(prev => [...prev, { id: prev.length + 1, sender, text }]);
  };

  useEffect(() => {
    if (view === 'analyzing') {
      const timer = setTimeout(() => {
        setView('analysis');
        setCurrentStep(2);
        addChatMessage("Analysis complete. I've identified 2 potential lesions. Please review and confirm each segment and edit the AI-generated notes. You may proceed to generate a report at any point.", 'bot');
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [view]);

  const handleSegmentInteraction = (segmentId: string, action: 'confirm' | 'dismiss' | 'updateNote', note?: string) => {
    let interactionText = '';
    setSegments(prevSegments => {
      return prevSegments.map(seg => {
        if (seg.id === segmentId) {
          if (action === 'confirm' && !seg.confirmed) {
            const newTumorCount = confirmedTumors + 1;
            setConfirmedTumors(newTumorCount);
            const tumorName = `Tumor ${newTumorCount}`;
            interactionText = `Log: ${tumorName} identified. Pre-treatment size: ${seg.size}.`;
            return { ...seg, confirmed: true, name: tumorName };
          }
          if (action === 'updateNote' && note !== undefined) {
            const tumorName = seg.confirmed ? seg.name : 'Unconfirmed Segment';
            interactionText = `Note for ${tumorName} updated.`;
            return { ...seg, note: note };
          }
        }
        return seg;
      });
    });
    if (interactionText) {
      addChatMessage(interactionText, 'system');
    }
  };

  const handleUserMessage = (message: string) => {
    addChatMessage(message, 'user');
    const lowerCaseMessage = message.toLowerCase().trim();
    let botResponse = "I'm not sure how to respond. You can ask for 'details for Tumor 1', 'calculate volume for Tumor 1', or 'what is the change in volume?'.";

    const tumor1 = segments.find(s => s.confirmed && s.name === `Tumor 1`);

    if (lowerCaseMessage.includes('calculate volume') && lowerCaseMessage.includes('tumor 1')) {
        if (tumor1) {
            botResponse = "The approximate pre-treatment volume of Tumor 1 is 161.6 cm³.";
        } else {
            botResponse = "Tumor 1 has not been confirmed yet. Please confirm the segment first.";
        }
    } else if (lowerCaseMessage.includes('change in volume')) {
        if (tumor1) {
            botResponse = "There is a significant reduction in tumor volume post-treatment, with an approximate decrease of 50 cm³. A detailed analysis is available in the final report.";
        } else {
            botResponse = "Please confirm Tumor 1 first to get details on volume changes.";
        }
    } else {
        const match = lowerCaseMessage.match(/details for (tumor|segment) (\d+)/);
        if (match) {
          const tumorNumber = parseInt(match[2], 10);
          const targetSegment = segments.find(s => s.confirmed && s.name === `Tumor ${tumorNumber}`);
    
          if (targetSegment) {
            const preTreatmentNote = targetSegment.note || 'No specific notes on pre-treatment scan.';
            const postTreatmentNote = targetSegment.postTreatment?.note || 'Post-treatment assessment is not available.';
            const preTreatmentSize = targetSegment.size || 'N/A';
    
            botResponse = `For ${targetSegment.name}, the AI findings are as follows:\n\n` +
              `**Pre-treatment:** The lesion has a longest axial diameter of approximately ${preTreatmentSize}. It demonstrates a pattern of heterogeneous arterial phase hyperenhancement (APHE) with subsequent washout, which are hallmark features of HCC. The AI-generated note is: "${preTreatmentNote}"\n\n` +
              `**Post-treatment:** ${postTreatmentNote}`;
          } else {
            botResponse = `Tumor ${tumorNumber} has not been confirmed yet. Please click on a segment and confirm it as a tumor first.`;
          }
        }
    }

    setTimeout(() => addChatMessage(botResponse, 'bot'), 500);
  };

  const handleGenerateReport = () => {
    setCurrentStep(3);
    navigate('/report', { state: { segments: segments } });
  };

  const handleUploadClick = (scanType: 'pre' | 'post') => {
    if (scanType === 'pre') {
      preScanInputRef.current?.click();
    } else {
      postScanInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, scanType: 'pre' | 'post') => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (scanType === 'pre') {
          setUploadedPreScan(reader.result as string);
        } else {
          setUploadedPostScan(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = () => {
    setView('analyzing');
    addChatMessage("Analyzing pre- and post-treatment scans to identify and measure lesions...", 'bot');
  };

  const renderContent = () => {
    switch (view) {
      case 'upload':
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <h3 className="text-2xl font-semibold mb-4">Step 1: Upload Scans</h3>
            <p className="text-slate-600 mb-6">Please upload the pre-treatment and post-treatment scans to begin the analysis.</p>
            <div className="flex gap-8 justify-center">
              {/* Pre-treatment Upload */}
              <div className="w-1/2 border border-slate-200 rounded-lg p-4 text-center flex flex-col">
                <h4 className="font-semibold text-slate-700 mb-2">Pre-treatment Scan</h4>
                <div className="flex-grow aspect-square bg-slate-100 rounded-md mb-4 flex items-center justify-center">
                  {uploadedPreScan ? (
                    <img src={uploadedPreScan} alt="Pre-treatment Scan" className="rounded-md w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-400 p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm">Awaiting scan...</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={preScanInputRef}
                  onChange={(e) => handleFileChange(e, 'pre')}
                  className="hidden"
                  accept="image/jpeg,image/png"
                />
                <button onClick={() => handleUploadClick('pre')} className="w-full bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors">
                  Upload DICOM / JPG
                </button>
              </div>
              {/* Post-treatment Upload */}
              <div className="w-1/2 border border-slate-200 rounded-lg p-4 text-center flex flex-col">
                <h4 className="font-semibold text-slate-700 mb-2">Post-treatment Scan</h4>
                <div className="flex-grow aspect-square bg-slate-100 rounded-md mb-4 flex items-center justify-center">
                  {uploadedPostScan ? (
                    <img src={uploadedPostScan} alt="Post-treatment Scan" className="rounded-md w-full h-full object-cover" />
                  ) : (
                    <div className="text-slate-400 p-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-2 text-sm">Awaiting scan...</p>
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={postScanInputRef}
                  onChange={(e) => handleFileChange(e, 'post')}
                  className="hidden"
                  accept="image/jpeg,image/png"
                />
                <button onClick={() => handleUploadClick('post')} className="w-full bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 transition-colors">
                  Upload DICOM / JPG
                </button>
              </div>
            </div>
            <div className="text-center mt-8">
              <button
                onClick={handleStartAnalysis}
                className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                disabled={!uploadedPreScan || !uploadedPostScan}
              >
                Start Analysis
              </button>
            </div>
          </div>
        );
      case 'analyzing':
        return <AnalysisLoader />;
      case 'analysis':
        if (!uploadedPreScan || !uploadedPostScan) {
          return (
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center">
              <h3 className="text-2xl font-semibold mb-4 text-red-600">Error</h3>
              <p className="text-slate-600 mb-6">Scan images are missing. Please return to the upload step to continue.</p>
              <button onClick={() => {
                setView('upload');
                setCurrentStep(1);
              }} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700">
                Go to Upload
              </button>
            </div>
          );
        }
        return (
          <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 flex flex-col items-center">
            <h3 className="text-2xl font-semibold mb-4 text-center">Step 2: Analysis & Confirmation</h3>
            <p className="text-slate-600 mb-6 max-w-2xl text-center">Review the AI-identified segments on the pre- and post-treatment scans. Click on a segment to confirm it as a tumor, dismiss it, or edit the notes.</p>
            <div className="flex justify-center gap-4 mb-4">
              <button onClick={() => setActiveScan('pre')} className={`px-4 py-2 rounded-md font-semibold ${activeScan === 'pre' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                Pre-treatment Scan
              </button>
              <button onClick={() => setActiveScan('post')} className={`px-4 py-2 rounded-md font-semibold ${activeScan === 'post' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}>
                Post-treatment Scan
              </button>
            </div>
            <ImageAnalysis
              imageSrc={activeScan === 'pre' ? uploadedPreScan : uploadedPostScan}
              segments={segments}
              onSegmentInteraction={handleSegmentInteraction}
              activeScan={activeScan}
            />
            <div className="text-center mt-8">
              <button onClick={handleGenerateReport} className="bg-green-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-green-700 transition-colors">
                Generate Report
              </button>
            </div>
          </div>
        );
    }
  };


  return (
    <div className="w-full flex gap-6">
      <div className="flex-grow">
        <ProgressBar currentStep={currentStep} />
        <div className="mt-6">
          {renderContent()}
        </div>
      </div>
      <aside className="w-1/3 max-w-md flex-shrink-0">
        <Chatbot messages={chatMessages} onSendMessage={handleUserMessage} />
      </aside>
    </div>
  );
};

export default AnalysisWorkflowPage;
