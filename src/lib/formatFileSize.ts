/**
 * Formata o tamanho do arquivo em bytes para uma string legível
 * @param bytes Tamanho em bytes
 * @returns String formatada (ex: "1.5 MB", "500 KB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return 'N/A';

  const units = ['B', 'KB', 'MB', 'GB'];
  const threshold = 1024;
  
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= threshold && unitIndex < units.length - 1) {
    size /= threshold;
    unitIndex++;
  }
  
  // Para bytes, não mostrar decimais
  if (unitIndex === 0) {
    return `${size} ${units[unitIndex]}`;
  }
  
  // Para outras unidades, mostrar até 2 decimais
  return `${size.toFixed(2)} ${units[unitIndex]}`;
}