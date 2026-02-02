
import React from 'react';
import { CodeBracketSquareIcon } from '../icons/EditorIcons'; // Placeholder icon, can be changed

const DataPanel: React.FC = () => {
  return (
    <div className="p-3 space-y-3 h-full flex flex-col bg-transparent">
      <h3 className="text-base font-semibold mb-2 text-text-primary flex items-center">
        <CodeBracketSquareIcon size={20} className="mr-2 text-accent-color" />
        Data
      </h3>
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-text-secondary italic">
          Data management features will be available here.
        </p>
      </div>
    </div>
  );
};

export default DataPanel;
