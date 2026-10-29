export function StatusBadge({
  classification,
}: {
  classification: string;
}) {
  const map: Record<string, { label: string; className: string }> = {
    structurally_valid: { label: "Structurally valid", className: "badge-valid" },
    invalid: { label: "Invalid", className: "badge-invalid" },
    unallocated: { label: "Unallocated block", className: "badge-unallocated" },
    unknown: { label: "Unknown / no coverage", className: "badge-unknown" },
    pending: { label: "Pending", className: "badge-pending" },
  };

  const item = map[classification] || {
    label: classification,
    className: "badge-pending",
  };

  return <span className={`badge ${item.className}`}>{item.label}</span>;
}
