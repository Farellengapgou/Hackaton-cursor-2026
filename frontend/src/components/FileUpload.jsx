/** Placeholder — phase D3 : drag & drop stylé */
export default function FileUpload({ onFile, disabled }) {
  return (
    <input
      type="file"
      accept=".csv"
      disabled={disabled}
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
      }}
    />
  )
}
