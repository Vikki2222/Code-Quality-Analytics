const SEVERITY_STYLES = {
  critical: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function FindingsList({ findings }) {
  if (findings.length === 0) {
    return (
      <p className="text-sm text-slate-500 mt-4">
        No issues found in this pull request.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {findings.map((finding, i) => (
        <li key={i} className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded border ${
                SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.low
              }`}
            >
              {finding.severity}
            </span>
            <span className="text-xs text-slate-500">{finding.category}</span>
            <span className="text-xs text-slate-400">
              {finding.file}
              {finding.line ? `:${finding.line}` : ''}
            </span>
          </div>
          <h3 className="font-medium text-slate-900">{finding.title}</h3>
          <p className="text-sm text-slate-600 mt-1">{finding.description}</p>
          {finding.recommendation && (
            <p className="text-sm text-slate-500 mt-2">
              <span className="font-medium text-slate-600">Suggested fix: </span>
              {finding.recommendation}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
