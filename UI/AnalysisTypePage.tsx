import React from 'react';
import { useNavigate } from 'react-router-dom';

const AnalysisOptionButton = ({ title, onClick, disabled }: { title: string, onClick?: () => void, disabled?: boolean }) => {
    const baseClasses = "w-full text-left p-6 border border-slate-200 rounded-lg transition-all duration-200 shadow-md flex justify-between items-center";
    const interactiveClasses = "hover:bg-blue-50 hover:border-blue-500 hover:shadow-lg cursor-pointer";
    const disabledClasses = "opacity-60 bg-slate-100 cursor-not-allowed";

    return (
        <button onClick={!disabled ? onClick : undefined} className={`${baseClasses} ${!disabled ? interactiveClasses : disabledClasses}`}>
            <span className="text-lg font-medium text-slate-700">{title}</span>
            {!disabled && <span className="text-blue-500">&rarr;</span>}
        </button>
    );
};

const AnalysisTypePage = () => {
    const navigate = useNavigate();

    return (
        <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200">
            <h2 className="text-3xl font-bold text-slate-800 mb-6 border-b pb-4">Liver Cancer Analysis</h2>
            <div className="space-y-4">
                <AnalysisOptionButton title="Tumor Morphology and Growth" onClick={() => navigate('/analysis-workflow/tumor-morphology')} />
                <AnalysisOptionButton title="Vascularity and Enhancement Patterns" onClick={() => navigate('/placeholder')} />
                <AnalysisOptionButton title="Vascular Invasion" onClick={() => navigate('/placeholder')} />
                <AnalysisOptionButton title="Metastatic Spread" onClick={() => navigate('/placeholder')} />
                <AnalysisOptionButton title="Liver Parenchymal Background" onClick={() => navigate('/placeholder')} />
            </div>
        </div>
    );
};

export default AnalysisTypePage;
