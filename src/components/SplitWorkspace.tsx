import type { ExtractedLetterData, UploadedDocument } from '../types/letter';
import { DocumentPreview } from './DocumentPreview';
import { ExtractionForm } from './ExtractionForm';

interface SplitWorkspaceProps {
  document: UploadedDocument;
  formData: ExtractedLetterData;
  isAnalyzing: boolean;
  onChange: (updated: ExtractedLetterData) => void;
  onSaveToArchive: (data: ExtractedLetterData) => void;
  onReset: () => void;
}

export function SplitWorkspace({
  document,
  formData,
  isAnalyzing,
  onChange,
  onSaveToArchive,
  onReset,
}: SplitWorkspaceProps) {
  return (
    <section aria-label="Area kerja pembacaan dan ekstraksi surat" className="pt-2">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-6 flex flex-col">
          <DocumentPreview document={document} />
        </div>
        <div className="lg:col-span-6 flex flex-col">
          <ExtractionForm
            formData={formData}
            isAnalyzing={isAnalyzing}
            onChange={onChange}
            onSaveToArchive={onSaveToArchive}
            onReset={onReset}
          />
        </div>
      </div>
    </section>
  );
}
