'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UploadCloud, File as FileIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { CornerstoneElementRef, CornerstoneWrapperType } from '@/lib/cornerstone-wrapper';

const Viewer = ({
  cornerstoneElementRef,
  isProcessing,
  CornerstoneWrapper
}: {
  cornerstoneElementRef: React.Ref<CornerstoneElementRef>;
  isProcessing: boolean;
  CornerstoneWrapper: CornerstoneWrapperType;
}) => {
  return (
    <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden flex items-center justify-center text-white">
      <CornerstoneWrapper ref={cornerstoneElementRef} />
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

type DicomUploadProps = {
  title: string;
  onFileSelected: (file: File | null) => void;
  file: File | null;
  cornerstoneElementRef: React.Ref<CornerstoneElementRef>;
};

export default function DicomUpload({ title, onFileSelected, file, cornerstoneElementRef }: DicomUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isViewerReady, setIsViewerReady] = useState(false);
  const [CornerstoneWrapper, setCornerstoneWrapper] = useState<CornerstoneWrapperType | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { toast } = useToast();

  // Dynamically import the Cornerstone wrapper and set it up once.
  useEffect(() => {
    if (typeof window !== 'undefined' && !CornerstoneWrapper) {
      import('@/lib/cornerstone-wrapper').then(module => {
        setCornerstoneWrapper(() => module.CornerstoneElement);
        module.initCornerstone().then(() => {
          setIsViewerReady(true);
        }).catch((err: any) => {
          console.error("Failed to initialize Cornerstone viewer:", err);
          toast({
            variant: "destructive",
            title: "Viewer Initialization Error",
            description: "Could not initialize the DICOM viewer. Please check your console.",
          });
        });
      }).catch((err: any) => {
        console.error("Failed to import Cornerstone module:", err);
        toast({
          variant: "destructive",
          title: "Import Error",
          description: "Could not load the Cornerstone module. Check your imports.",
        });
      });
    }
  }, [CornerstoneWrapper, toast]);

  // Effect to load and display the image once the file and viewer are ready
  useEffect(() => {
    const loadImage = async () => {
      // Ensure all necessary conditions are met before proceeding
      if (!file || !isViewerReady || !CornerstoneWrapper || !cornerstoneElementRef || !('current' in cornerstoneElementRef) || !cornerstoneElementRef.current) {
        return;
      }

      const element = cornerstoneElementRef.current.getElement();
      if (!element) {
        console.warn("Cornerstone viewer element is null despite viewer being reported as ready.");
        return;
      }

      setIsProcessing(true); // Set processing here as image loading begins

      try {
        const cornerstoneModule = await import('@/lib/cornerstone-wrapper');
        await cornerstoneModule.loadAndDisplayImage(element, file);
      } catch (error) {
        console.error("Error loading DICOM image:", error);
        toast({
          variant: 'destructive',
          title: 'Image Display Error',
          description: error instanceof Error ? error.message : 'Could not display the DICOM image.',
        });
        onFileSelected(null); // Clear the file on display error
      } finally {
        setIsProcessing(false);
      }
    };

    loadImage();
  }, [file, isViewerReady, CornerstoneWrapper, cornerstoneElementRef, toast, onFileSelected]);


  const processFile = useCallback(async (selectedFile: File) => {
    if (!selectedFile) return;

    if (!selectedFile.name.toLowerCase().endsWith('.dcm')) {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a DICOM file (.dcm).',
      });
      return;
    }

    // Now, simply set the file. The useEffect above will handle loading and processing
    onFileSelected(selectedFile);
  }, [onFileSelected, toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
    event.target.value = '';
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const selectedFile = event.dataTransfer.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  }, [processFile]);

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleRemove = useCallback(() => {
    onFileSelected(null);
    if (cornerstoneElementRef && 'current' in cornerstoneElementRef && cornerstoneElementRef.current) {
      const element = cornerstoneElementRef.current.getElement();
      if (element) {
        import('cornerstone-core').then(cornerstone => {
          try {
            if (cornerstone.getEnabledElement(element)) {
              cornerstone.disable(element);
            }
          } catch (e) {
            console.warn("Error disabling Cornerstone element on remove:", e);
          }
        }).catch(err => {
            console.error("Failed to import cornerstone-core for disable:", err);
        });
      }
    }
  }, [onFileSelected, cornerstoneElementRef]);

  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg font-semibold">{title}</span>
          {file && (
            <Button variant="ghost" size="icon" onClick={handleRemove} className="h-6 w-6 text-muted-foreground hover:text-destructive">
              <X className="h-4 w-4" />
              <span className="sr-only">Remove image</span>
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {file ? (
          <div className="space-y-4">
            {CornerstoneWrapper ? (
              <Viewer cornerstoneElementRef={cornerstoneElementRef} isProcessing={isProcessing} CornerstoneWrapper={CornerstoneWrapper} />
            ) : (
              <div className="relative w-full h-96 bg-black rounded-lg overflow-hidden flex items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading Viewer...</span>
              </div>
            )}
            <div className="flex items-center space-x-2 text-sm text-muted-foreground bg-secondary p-2 rounded-md">
              <FileIcon className="h-4 w-4" />
              <span className="truncate">{file.name}</span>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg transition-colors cursor-pointer bg-background hover:bg-accent/10",
              isDragging ? 'border-primary bg-accent/20' : 'border-border hover:border-primary',
              (!isViewerReady) && 'cursor-wait' // Only show wait cursor if viewer itself is not ready
            )}
            onClick={() => !(!isViewerReady) && inputRef.current?.click()}
            onDrop={(!isViewerReady) ? undefined : handleDrop}
            onDragOver={(!isViewerReady) ? undefined : handleDragOver}
            onDragLeave={(!isViewerReady) ? undefined : handleDragLeave}
          >
            {!isViewerReady ? (
              <>
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin" />
                <p className="mt-2 text-sm text-muted-foreground">Initializing Viewer...</p>
              </>
            ) : (
              <>
                <UploadCloud className="w-12 h-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">DICOM file (.dcm)</p>
              </>
            )}
            <Input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".dcm"
              onChange={handleFileChange}
              disabled={!isViewerReady}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
