// @/components/clarity-scan/ReportDisplay.tsx
'use client';

import { useState, useCallback, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, FileText, Download, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

// --- Type Definitions ---
export type EditableReportData = {
  [key: string]: string; // key is a unique ID for a text block, value is its content
};

type ReportBlock =
  | { type: 'heading'; level: 1 | 2; content: string; key: string }
  | { type: 'horizontalRule'; key: string }
  | { type: 'paragraph'; content: { id: string; text: string; isBold: boolean }[]; key: string }
  | { type: 'listItem'; content: { id: string; text: string; isBold: boolean }[]; key: string; indentation: number };

type ReportDisplayProps = {
  report: string | null;
  isLoading: boolean;
};

// --- Enhanced EditableField Component ---
const EditableField = ({
  id,
  value,
  onValueChange,
  isBold,
}: {
  id: string;
  value: string;
  onValueChange: (id: string, value: string) => void;
  isBold?: boolean;
}) => {
  return (
    <Input
      value={value}
      onChange={(e) => onValueChange(id, e.target.value)}
      className={cn(
        "bg-transparent border-0 border-b border-dotted border-transparent p-0 h-auto",
        "font-normal text-base leading-relaxed text-inherit font-serif",
        "focus:outline-none focus:ring-0 focus:bg-blue-50/50 focus:border-blue-400 rounded-sm",
        "hover:bg-blue-50/50 hover:border-blue-300",
        "inline-block w-auto align-baseline",
        isBold && "font-bold",
        "transition-colors duration-150"
      )}
      style={{ minWidth: '1ch', width: `${value.length + 1}ch` }} // Dynamic width based on content
    />
  );
};


// --- CORRECTED Parsing Logic ---
const parseReport = (reportText: string): { blocks: ReportBlock[]; initialData: EditableReportData } => {
  const blocks: ReportBlock[] = [];
  const initialData: EditableReportData = {};
  const lines = reportText.split('\n');
  let blockCounter = 0;
  let partCounter = 0;

  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    const key = `block-${lineIndex}-${blockCounter++}`;

    // Rule 1: Check for horizontal rule
    if (trimmedLine === '---') {
      blocks.push({ type: 'horizontalRule', key });
    }
    // Rule 2: Check for the specific main title (H1)
    else if (trimmedLine === '**COMPARATIVE ANALYSIS DRAFT REPORT**') {
      blocks.push({ type: 'heading', level: 1, content: trimmedLine.replace(/\*\*/g, ''), key });
    }
    // Rule 3: Check for section titles (H2).
    // This is a line fully enclosed in '**' that isn't a label (doesn't contain ':')
    else if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**') && !trimmedLine.slice(2, -2).includes(':')) {
      blocks.push({ type: 'heading', level: 2, content: trimmedLine.replace(/\*\*/g, ''), key });
    }
    // Rule 4: If it's not a heading, parse it as a paragraph or list item
    else {
      const parts: { id: string; text: string; isBold: boolean }[] = [];
      const boldRegex = /\*\*(.*?)\*\*/g;
      let lastIndex = 0;
      let match;

      // Use the original 'line' to preserve leading whitespace for indentation
      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          const text = line.substring(lastIndex, match.index);
          const id = `part-${partCounter++}`;
          parts.push({ id, text, isBold: false });
          initialData[id] = text;
        }
        const boldText = match[1];
        const boldId = `part-${partCounter++}`;
        parts.push({ id: boldId, text: boldText, isBold: true });
        initialData[boldId] = boldText;
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex < line.length) {
        const text = line.substring(lastIndex);
        const id = `part-${partCounter++}`;
        parts.push({ id, text, isBold: false });
        initialData[id] = text;
      }

      if (parts.length > 0 && trimmedLine.length > 0) {
        const indentationMatch = line.match(/^\s*/);
        const indentation = indentationMatch ? Math.floor(indentationMatch[0].length / 2) : 0;
        if (trimmedLine.startsWith('* ')) {
          blocks.push({ type: 'listItem', content: parts, key, indentation });
        } else {
          blocks.push({ type: 'paragraph', content: parts, key });
        }
      }
    }
  });
  return { blocks, initialData };
};


// --- Main ReportDisplay Component ---
const ReportDisplay = forwardRef<{ downloadPdf: () => void }, ReportDisplayProps>(({ report, isLoading }, ref) => {
  const [editableData, setEditableData] = useState<EditableReportData | null>(null);
  const [reportBlocks, setReportBlocks] = useState<ReportBlock[]>([]);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const reportContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (report && !isLoading) {
      const { blocks, initialData } = parseReport(report);
      setEditableData(initialData);
      setReportBlocks(blocks);
    } else {
      setEditableData(null);
      setReportBlocks([]);
    }
  }, [report, isLoading]);

  const handleDataChange = useCallback((id: string, value: string) => {
    setEditableData(prevData => ({ ...prevData, [id]: value }));
  }, []);

  // --- PDF Download Functionality ---
  const downloadPdf = useCallback(async () => {
    const reportElement = reportContentRef.current;
    if (!reportElement || !editableData) {
      toast({ variant: 'destructive', title: 'PDF Error', description: 'Report content is not ready.' });
      return;
    }
    setIsDownloading(true);
    reportElement.classList.add('preparing-for-pdf');

    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2, useCORS: true, logging: false,
        onclone: (doc) => {
          doc.querySelectorAll('.preparing-for-pdf input').forEach(el => {
            const input = el as HTMLInputElement;
            const span = doc.createElement('span');
            span.innerText = input.value;
            if (input.classList.contains('font-bold')) {
                span.style.fontWeight = 'bold';
            }
            span.className = input.className.replace(/font-bold/g, '');
            input.parentNode?.replaceChild(span, input);
          });
        }
      });
      
      reportElement.classList.remove('preparing-for-pdf');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdf.internal.pageSize.getHeight();

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdf.internal.pageSize.getHeight();
      }

      pdf.save('Comparative_Analysis_Draft_Report.pdf');
      toast({ title: 'PDF Generated', description: 'Report downloaded successfully.' });
    } catch (error) {
      reportElement.classList.remove('preparing-for-pdf');
      console.error('Error generating PDF:', error);
      toast({ variant: 'destructive', title: 'PDF Generation Failed', description: `${error instanceof Error ? error.message : String(error)}.` });
    } finally {
      setIsDownloading(false);
    }
  }, [editableData, toast]);

  useImperativeHandle(ref, () => ({ downloadPdf }));

  // --- Rendering Logic ---
  const renderReportContent = useCallback(() => {
    if (!reportBlocks.length || !editableData) return null;

    let listItemsBuffer: React.ReactNode[] = [];
    const renderedNodes: React.ReactNode[] = [];

    const flushListItems = () => {
      if (listItemsBuffer.length > 0) {
        renderedNodes.push(
          <ul key={`ul-${renderedNodes.length}`} className="list-disc pl-6 my-2 space-y-1">
            {listItemsBuffer}
          </ul>
        );
        listItemsBuffer = [];
      }
    };

    reportBlocks.forEach((block) => {
      if (block.type !== 'listItem') {
        flushListItems();
      }

      switch (block.type) {
        case 'horizontalRule':
          renderedNodes.push(<hr key={block.key} className="my-6 border-slate-300" />);
          break;
        case 'heading':
          const HeadingTag = `h${block.level}` as const;
          renderedNodes.push(
            <HeadingTag key={block.key} className={cn('font-sans tracking-tight text-slate-800', block.level === 1 ? "text-2xl font-bold text-center my-6" : "text-xl font-semibold mt-6 mb-2 border-b-2 border-slate-200 pb-2 text-blue-800")}>
              {block.content}
            </HeadingTag>
          );
          break;
        case 'paragraph':
        case 'listItem':
          const content = block.content.map((part) => {
            let textValue = editableData[part.id] || '';
            if (block.type === 'listItem' && block.content[0].id === part.id) {
                textValue = textValue.trim().replace(/^\*\s?/, '');
            }
            return <EditableField key={part.id} id={part.id} value={textValue} onValueChange={handleDataChange} isBold={part.isBold} />;
          });
          
          if (block.type === 'listItem') {
            const indentationStyle = { paddingLeft: `${block.indentation * 1.5}rem` };
            listItemsBuffer.push(<li key={block.key} className="pl-2" style={indentationStyle}>{content}</li>);
          } else {
            renderedNodes.push(<p key={block.key} className="my-2">{content}</p>);
          }
          break;
        default: break;
      }
    });

    flushListItems();
    return renderedNodes;
  }, [reportBlocks, editableData, handleDataChange]);

  // --- Component Return (JSX) ---
  return (
    <Card className="h-full flex flex-col shadow-lg rounded-xl overflow-hidden bg-slate-50">
      <CardHeader className="bg-white border-b border-slate-200 p-4 flex-row items-center justify-between">
        <CardTitle className="flex items-center text-lg font-semibold text-slate-800">
          <FileText className="mr-3 h-6 w-6 text-blue-600" />
          Comparative Analysis Draft Report
        </CardTitle>
        <Button onClick={downloadPdf} disabled={isDownloading || isLoading || !report} className="bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-200 rounded-md px-4 py-2 text-sm font-semibold shadow">
          {isDownloading ? <><Loader2 className="animate-spin mr-2 h-4 w-4" /> Generating...</> : <><Download className="mr-2 h-4 w-4" /> Download PDF</>}
        </Button>
      </CardHeader>
      <CardContent className="flex-grow p-4 md:p-6 overflow-hidden">
        <ScrollArea className="h-full bg-white rounded-lg shadow-inner border border-slate-200">
          <style jsx global>{`
            .preparing-for-pdf input {
              background-color: transparent !important;
              border-color: transparent !important;
              box-shadow: none !important;
              color: inherit !important;
              font-weight: inherit !important;
            }
          `}</style>
          <div
            id="report-content-display"
            ref={reportContentRef}
            className="prose max-w-none p-8 mx-auto font-serif text-slate-800 leading-relaxed"
          >
            {isLoading && <div className="space-y-4"><Skeleton className="h-8 w-3/4 mx-auto" /><Skeleton className="h-6 w-1/3 mt-6" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6" /><Skeleton className="h-24 w-full mt-4" /></div>}
            {!isLoading && !report && <div className="flex not-prose flex-col items-center justify-center text-center text-slate-500 h-full min-h-[300px]"><Bot className="h-16 w-16 mb-4 text-blue-400" /><h3 className="text-lg font-semibold text-slate-700 font-sans">AI Analysis Will Appear Here</h3><p className="text-sm text-slate-600 font-sans">Upload both images and click "Generate Report" to begin.</p></div>}
            {report && editableData && !isLoading && renderReportContent()}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

ReportDisplay.displayName = "ReportDisplay";
export default ReportDisplay;
