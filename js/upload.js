export async function subirImagen(file, userId, bucket = 'productos') {
  const formData = new FormData()
  formData.append('file', file)

  const res  = await fetch(`api/upload.php?bucket=${bucket}`, {
    method: 'POST',
    body: formData
  })
  const data = await res.json()

  if (data.error) { console.error('Error subiendo imagen:', data.error); return null }
  return data.url
}