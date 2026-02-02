
import React, { useRef } from 'react';
import { DocumentArrowUpIcon, ImageIcon } from '../icons/EditorIcons'; // Assuming ImageIcon is for general assets

interface AssetsPanelProps {
  onSvgImport: (svgString: string) => void;
}

const AssetsPanel: React.FC<AssetsPanelProps> = ({ onSvgImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const svgString = e.target?.result as string;
        if (svgString) {
          onSvgImport(svgString);
        }
      };
      reader.readAsText(file);
      event.target.value = ''; // Reset file input
    }
  };

  const actionButtonClass = "w-full flex items-center justify-center glass-button text-sm";

  return (
    <div className="p-3 space-y-3 h-full flex flex-col bg-transparent">
      <h3 className="text-lg font-semibold mb-3 text-text-primary flex items-center">
        <ImageIcon size={22} className="mr-2 text-accent-color" /> 
        Manage Assets
      </h3>
      <div className="space-y-2">
        <button onClick={handleImportClick} className={actionButtonClass}>
          <DocumentArrowUpIcon size={18} className="mr-2" /> Import SVG
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".svg"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Import SVG file"
        />
      </div>
      {/* Future asset listings can go here */}
      <div className="flex-1 flex items-center justify-center">
        <p className="text-xs text-text-secondary italic">More asset types coming soon.</p>
      </div>
    </div>
  );
};

export default AssetsPanel;
