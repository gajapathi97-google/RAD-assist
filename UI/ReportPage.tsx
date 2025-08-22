import React, { useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ProgressBar from '../ProgressBar';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import RichTextEditor from '../RichTextEditor';
import type { Segment } from '../../types';

const calculatePercentageChange = (preSizeStr: string, postSizeStr: string): string => {
    const preMatch = preSizeStr.match(/(\d+\.?\d*)/);
    const postMatch = postSizeStr.match(/(\d+\.?\d*)/);

    if (preMatch && postMatch) {
        const pre = parseFloat(preMatch[1]);
        const post = parseFloat(postMatch[1]);
        if (pre > 0) {
            const change = ((pre - post) / pre) * 100;
            return `${change.toFixed(1)}%`;
        }
    }
    return 'N/A';
};

const generateReportHtml = (segments: Segment[]): string => {
    const primaryLesion = segments.length > 0 ? segments[0] : null;
    const preSize = primaryLesion?.size?.split('x')[0].trim() ?? 'N/A';
    const postSize = primaryLesion?.postTreatment?.size?.split(':')[1]?.trim() ?? 'N/A';
    const percentageChange = primaryLesion ? calculatePercentageChange(preSize, postSize) : 'N/A';

    return `
<div class="bg-white p-8 font-sans text-xs text-black border border-gray-300 shadow-lg">
    <header class="flex justify-between items-start pb-2 border-b-2 border-blue-800">
        <div class="flex items-center gap-3">
            <div class="w-14 h-14 bg-blue-700 rounded-full flex items-center justify-center text-white p-1">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1.5-6.09c0-.25.2-.41.5-.41h2c.3 0 .5.16.5.41l-.16 3.18c0 .25-.2.41-.5.41h-1.68c-.3 0-.5-.16-.5-.41L10.5 15.91zm1.5-4.82c-.66 0-1.15-.52-1.15-1.15S11.34 8.8 12 8.8s1.15.52 1.15 1.15-.49 1.14-1.15 1.14z" fill="white" stroke="none" />
                </svg>
            </div>
            <div>
                <h1 class="text-xl font-bold text-blue-800">SMART IMAGING CENTER</h1>
                <p class="font-semibold text-gray-700">X-Ray | CT-Scan | MRI | USG</p>
                <p class="text-[10px] text-gray-500">105-108, SMART VISION COMPLEX, HEALTHCARE ROAD, OPPOSITE HEALTHCARE COMPLEX, MUMBAI - 689578</p>
            </div>
        </div>
        <div class="text-right text-[11px] text-gray-600">
            <p><strong>Tel:</strong> 9123456789 / 8912345678</p>
            <p><strong>Email:</strong> smartpatholab@gmail.com</p>
        </div>
    </header>
    <div class="w-full h-1 bg-blue-700"></div>

    <section class="grid grid-cols-2 gap-4 py-2 my-2 border-y border-gray-200">
        <div class="flex items-start gap-4">
                <div class="font-semibold text-gray-800">
                    <p>Yash M. Patel</p>
                    <p class="text-gray-600 font-normal">Age: 21 Years</p>
                    <p class="text-gray-600 font-normal">Sex: Male</p>
                </div>
                <div class="w-12 h-12 bg-gray-200 border border-gray-400"></div>
        </div>
            <div class="text-right border-l border-gray-200 pl-4 text-gray-600 grid grid-cols-2">
                <div>
                <p><strong>PID:</strong></p>
                <p><strong>Apt ID:</strong></p>
                <p><strong>Ref. By:</strong></p>
                </div>
                <div class="text-left pl-2">
                <p>555</p>
                <p>2025252</p>
                <p>Dr. Hiren Shah</p>
                </div>
                <div class="col-span-2 text-right mt-1">
                <p><strong>Registered on:</strong> 02:31 PM 02 Dec, 22</p>
                <p><strong>Reported on:</strong> 04:35 PM 02 Dec, 22</p>
                </div>
            </div>
    </section>
    
    <h2 class="text-center font-bold text-base my-2 underline">COMPARATIVE ANALYSIS DRAFT REPORT</h2>

    <main>
        <section class="mt-4">
            <h3 class="text-sm font-bold underline uppercase tracking-wider">Study Information</h3>
            <div class="mt-2 text-gray-800 space-y-1">
                <p><strong>Modality:</strong> CT Abdomen/Pelvis with IV Contrast (Multiphasic)</p>
                <p><strong>Indication:</strong> Follow-up of Hepatocellular Carcinoma (HCC) s/p Transarterial Chemoembolization (TACE)</p>
                <p><strong>Comparison Study 1 (Pre-treatment):</strong> Study Date: 2022-01-15</p>
                <p><strong>Comparison Study 2 (Post-treatment):</strong> Study Date: 2022-04-20</p>
            </div>
        </section>
        
        <section class="mt-4">
            <h3 class="text-sm font-bold underline uppercase tracking-wider">Findings</h3>
            <div class="mt-2 text-gray-800 space-y-1">
                <p><strong>LIVER:</strong></p>
                <p class="pl-4"><strong>Pre-treatment:</strong> Presence of a dominant Hepatocellular Carcinoma (HCC) lesion located in the liver right lobe, segment 6. It appears as a large, well-defined mass measuring approximately ${preSize} in axial diameter. The lesion demonstrates heterogeneous arterial enhancement with early washout.</p>
                <p class="pl-4"><strong>Post-treatment:</strong> The previously described HCC lesion now measures approximately ${postSize} in axial diameter. The enhancement pattern is altered with significant central necrosis and reduced peripheral enhancement, consistent with post-TACE changes. No new enhancing lesions are identified.</p>
            </div>
        </section>

        <section class="mt-4">
            <h3 class="text-sm font-bold underline uppercase tracking-wider">Quantitative Assessment</h3>
            <div class="mt-2 text-gray-800 space-y-1">
                <p><strong>Target Lesion (HCC):</strong></p>
                <p class="pl-4"><strong>Location:</strong> Right lobe, Segment 6</p>
                <p class="pl-4"><strong>Pre-treatment Size (Longest Diameter):</strong> ${preSize}</p>
                <p class="pl-4"><strong>Post-treatment Size (Longest Diameter):</strong> ${postSize}</p>
                <p class="pl-4"><strong>Percentage Change in Size:</strong> ${percentageChange}</p>
                <p class="pl-4"><strong>Qualitative Changes:</strong> Significant decrease in overall size and increased central necrosis, with reduced arterial enhancement.</p>
            </div>
        </section>

        <section class="mt-4">
            <h3 class="text-sm font-bold underline uppercase tracking-wider">Impression</h3>
            <div class="mt-2 text-gray-800 space-y-1">
                <p><strong>Overall Treatment Response:</strong> The current findings are suggestive of partial response following TACE treatment, primarily based on a ${percentageChange} decrease in the longest axial diameter of the dominant HCC in Right lobe, Segment 6 and evidence of extensive intratumoral necrosis.</p>
                <p>Residual viable tumor cannot be entirely excluded given persistent mild peripheral enhancement. Follow-up is essential to monitor for recurrence.</p>
            </div>
        </section>

            <section class="mt-4">
                <h3 class="text-sm font-bold underline uppercase tracking-wider">Recommendations</h3>
                <div class="mt-2 text-gray-800 space-y-1">
                    <p>Recommend follow-up multiphasic CT or MRI of the liver in 3-6 months to assess for further treatment response or recurrence.</p>
                </div>
            </section>
    </main>

    <footer class="mt-6 pt-4 border-t border-gray-300">
            <p class="text-center text-gray-500 text-[10px] pb-4">****End of Report****</p>
            <div class="flex justify-around items-end text-center">
            <div>
                <div class="h-8 mb-1"></div>
                <p class="border-t border-gray-400 pt-1"><strong>Radiologic Technologists</strong></p>
                <p class="text-gray-600">(MSC, PGDM)</p>
            </div>
            <div>
                    <div class="h-8 mb-1"></div>
                <p class="border-t border-gray-400 pt-1"><strong>Dr. Payal Shah</strong></p>
                <p class="text-gray-600">(MD, Radiologist)</p>
            </div>
            <div>
                    <div class="h-8 mb-1"></div>
                <p class="border-t border-gray-400 pt-1"><strong>Dr. Vimal Shah</strong></p>
                <p class="text-gray-600">(MD, Radiologist)</p>
            </div>
        </div>
        <div class="mt-4 text-[10px] text-red-700 bg-red-50 p-2 border border-red-200 rounded">
            <p><strong>Disclaimer:</strong> This report is an AI-generated draft for assisting radiologists. It is based on image analysis and publicly available knowledge, and does not constitute a final medical diagnosis or substitute for professional medical judgment. All findings and interpretations must be independently reviewed, verified, and finalized by a qualified human radiologist.</p>
        </div>
            <div class="mt-4 h-4 relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-blue-800"></div>
                <div class="absolute bottom-0 left-0 w-full h-1 bg-gray-800"></div>
        </div>
    </footer>
</div>
    `;
};


const ReportPage = () => {
    const location = useLocation();
    const { segments = [] } = location.state || {};
    const reportContentRef = useRef<HTMLDivElement>(null);
    
    const initialReportHtml = generateReportHtml(segments);

    const handleDownload = () => {
        const input = reportContentRef.current;
        if (input) {
            // Find the contentEditable div inside the ref
            const editorContent = input.querySelector('[contenteditable="true"]');
            const targetElement = editorContent instanceof HTMLElement ? editorContent : input;

            html2canvas(targetElement, { scale: 2, scrollY: -window.scrollY, windowWidth: document.documentElement.offsetWidth, windowHeight: document.documentElement.offsetHeight })
                .then((canvas) => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF('p', 'mm', 'a4');
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const imgWidth = canvas.width;
                    const imgHeight = canvas.height;
                    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
                    const imgX = (pdfWidth - imgWidth * ratio) / 2;
                    const imgY = 0;
                    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                    pdf.save('Radiology-Report.pdf');
                });
        }
    };

    return (
        <div>
            <ProgressBar currentStep={3} />
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 mt-6">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-800">Step 3: Final Radiology Report</h2>
                        <p className="text-slate-600">The AI has generated a draft report. Review and edit the document below before finalizing.</p>
                    </div>
                    <button onClick={handleDownload} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors">
                        Download Report as PDF
                    </button>
                </div>
                <div ref={reportContentRef}>
                    <RichTextEditor initialContent={initialReportHtml} />
                </div>
            </div>
        </div>
    );
};

export default ReportPage;
