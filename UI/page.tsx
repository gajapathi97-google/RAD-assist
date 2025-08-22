'use client';

import { useState, useRef } from 'react';
import DicomUpload from '@/components/clarity-scan/DicomUpload';
import ReportDisplay from '@/components/clarity-scan/ReportDisplay';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { generateComparativeReportAction } from './actions';
import { TestTube2, Bot, Loader2 } from 'lucide-react';
import type { CornerstoneElementRef } from '@/lib/cornerstone-wrapper';

// Helper function to get the current image displayed on the element as a data URL (PNG)
const getImageDataAsPng = async (element: HTMLDivElement): Promise<string | null> => {
    const cornerstone = await import('cornerstone-core');
    const enabledElement = cornerstone.getEnabledElement(element);
    if (!enabledElement || !enabledElement.image) {
        return null;
    }
    const canvas = enabledElement.canvas;
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
};

export default function Home() {
  const [preTreatmentFile, setPreTreatmentFile] = useState<File | null>(null);
  const [postTreatmentFile, setPostTreatmentFile] = useState<File | null>(null);

  const preTreatmentRef = useRef<CornerstoneElementRef>(null);
  const postTreatmentRef = useRef<CornerstoneElementRef>(null);
  
  const [rawReport, setRawReport] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    const preTreatmentElement = preTreatmentRef.current?.getElement();
    const postTreatmentElement = postTreatmentRef.current?.getElement();

    if (!preTreatmentElement || !postTreatmentElement) {
        toast({
            variant: 'destructive',
            title: 'Missing Images',
            description: 'Please ensure both DICOM images are loaded and displayed.',
        });
        return;
    }
    
    const preTreatmentImage = await getImageDataAsPng(preTreatmentElement);
    const postTreatmentImage = await getImageDataAsPng(postTreatmentElement);

    if (!preTreatmentImage || !postTreatmentImage) {
      toast({
        variant: 'destructive',
        title: 'Image Rendering Incomplete',
        description: 'Could not capture image data. Please try reloading the images.',
      });
      return;
    }
    
    setIsGenerating(true);
    setRawReport(null);
    
    try {
      const result = await generateComparativeReportAction({
        preTreatmentImage: preTreatmentImage,
        postTreatmentImage: postTreatmentImage,
      });

      if (result.error) {
        throw new Error(result.error);
      }
      
      setRawReport(result.report!);

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({
        variant: 'destructive',
        title: 'Report Generation Failed',
        description: errorMessage,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-16 flex items-center shadow-md bg-card border-b">
        <TestTube2 className="h-6 w-6 text-primary" />
        <h1 className="ml-3 text-2xl font-bold tracking-tighter">RAD Assist</h1>
      </header>
      <main className="flex-1 p-4 md:p-8 lg:p-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <DicomUpload 
              title="Pre-Treatment Scan" 
              onFileSelected={setPreTreatmentFile}
              file={preTreatmentFile}
              cornerstoneElementRef={preTreatmentRef}
            />
            <DicomUpload 
              title="Post-Treatment Scan" 
              onFileSelected={setPostTreatmentFile}
              file={postTreatmentFile}
              cornerstoneElementRef={postTreatmentRef}
            />
          </div>
          
          <Button 
            onClick={handleGenerateReport} 
            disabled={isGenerating || !preTreatmentFile || !postTreatmentFile}
            className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin mr-3 h-6 w-6" />
                Generating Report...
              </>
            ) : (
              <>
                <Bot className="mr-2 h-6 w-6" />
                Generate Comparative Report
              </>
            )}
          </Button>

          <div className="w-full">
            <ReportDisplay 
              report={rawReport} 
              isLoading={isGenerating}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
