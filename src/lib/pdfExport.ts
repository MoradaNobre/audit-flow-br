/**
 * Biblioteca de Exportação para PDF
 * Exportação de relatórios usando html2canvas + jsPDF
 * Fase 2.2 - Relatórios Básicos
 */

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import type { RelatorioData } from '@/components/RelatorioTemplate';

export interface PDFExportOptions {
  filename?: string;
  quality?: number;
  format?: 'a4' | 'letter';
  orientation?: 'portrait' | 'landscape';
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  includeHeader?: boolean;
  includeFooter?: boolean;
  watermark?: string;
}

export interface PDFExportResult {
  success: boolean;
  filename: string;
  size: number;
  pages: number;
  error?: string;
}

/**
 * Classe principal para exportação de PDFs
 */
export class PDFExporter {
  private defaultOptions: Required<PDFExportOptions> = {
    filename: 'relatorio-auditoria.pdf',
    quality: 1.0,
    format: 'a4',
    orientation: 'portrait',
    margins: {
      top: 20,
      right: 20,
      bottom: 20,
      left: 20
    },
    includeHeader: true,
    includeFooter: true,
    watermark: ''
  };

  /**
   * Exportar elemento HTML para PDF
   */
  async exportElementToPDF(
    elementId: string, 
    options: Partial<PDFExportOptions> = {}
  ): Promise<PDFExportResult> {
    const config = { ...this.defaultOptions, ...options };
    
    try {
      console.log('🔄 Iniciando exportação para PDF...');
      
      // Encontrar elemento
      const element = document.getElementById(elementId);
      if (!element) {
        throw new Error(`Elemento com ID '${elementId}' não encontrado`);
      }

      // Preparar elemento para captura
      await this.prepareElementForCapture(element);

      // Capturar elemento como imagem
      console.log('📸 Capturando elemento...');
      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        background: '#ffffff',
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // Configurar PDF
      const pdf = new jsPDF({
        orientation: config.orientation,
        unit: 'mm',
        format: config.format
      });

      // Dimensões da página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentWidth = pageWidth - config.margins.left - config.margins.right;
      const contentHeight = pageHeight - config.margins.top - config.margins.bottom;

      // Dimensões da imagem
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(contentWidth / (imgWidth * 0.264583), contentHeight / (imgHeight * 0.264583));

      const scaledWidth = imgWidth * 0.264583 * ratio;
      const scaledHeight = imgHeight * 0.264583 * ratio;

      // Adicionar cabeçalho se solicitado
      if (config.includeHeader) {
        this.addHeader(pdf, config);
      }

      // Adicionar marca d'água se especificada
      if (config.watermark) {
        this.addWatermark(pdf, config.watermark);
      }

      // Converter canvas para imagem
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Calcular quantas páginas são necessárias
      const totalPages = Math.ceil(scaledHeight / contentHeight);
      
      for (let page = 0; page < totalPages; page++) {
        if (page > 0) {
          pdf.addPage();
          if (config.includeHeader) {
            this.addHeader(pdf, config);
          }
          if (config.watermark) {
            this.addWatermark(pdf, config.watermark);
          }
        }

        const yOffset = -(page * contentHeight);
        const adjustedY = config.margins.top + yOffset;

        pdf.addImage(
          imgData,
          'JPEG',
          config.margins.left,
          adjustedY,
          scaledWidth,
          scaledHeight
        );

        // Adicionar rodapé se solicitado
        if (config.includeFooter) {
          this.addFooter(pdf, config, page + 1, totalPages);
        }
      }

      // Salvar PDF
      console.log('💾 Salvando PDF...');
      pdf.save(config.filename);

      const result: PDFExportResult = {
        success: true,
        filename: config.filename,
        size: pdf.output('blob').size,
        pages: totalPages
      };

      console.log('✅ PDF exportado com sucesso:', result);
      return result;

    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      const result: PDFExportResult = {
        success: false,
        filename: config.filename,
        size: 0,
        pages: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
      return result;
    }
  }

  /**
   * Exportar relatório específico
   */
  async exportReport(
    reportData: RelatorioData, 
    options: Partial<PDFExportOptions> = {}
  ): Promise<PDFExportResult> {
    const filename = options.filename || this.generateReportFilename(reportData);
    const exportOptions: Partial<PDFExportOptions> = {
      ...options,
      filename,
      watermark: options.watermark || 'AUDIT FLOW BR - CONFIDENCIAL'
    };

    return this.exportElementToPDF('relatorio-content', exportOptions);
  }

  /**
   * Preparar elemento para captura
   */
  private async prepareElementForCapture(element: HTMLElement): Promise<void> {
    // Aguardar renderização de gráficos
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Forçar re-render de elementos lazy
    const lazyElements = element.querySelectorAll('[data-lazy]');
    lazyElements.forEach(el => {
      (el as HTMLElement).style.visibility = 'visible';
    });

    // Expandir elementos colapsados
    const collapsedElements = element.querySelectorAll('.collapsed, .hidden');
    collapsedElements.forEach(el => {
      (el as HTMLElement).style.display = 'block';
      (el as HTMLElement).style.visibility = 'visible';
    });
  }

  /**
   * Adicionar cabeçalho ao PDF
   */
  private addHeader(pdf: jsPDF, config: Required<PDFExportOptions>): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Linha superior
    pdf.setDrawColor(59, 130, 246); // blue-500
    pdf.setLineWidth(2);
    pdf.line(config.margins.left, 15, pageWidth - config.margins.right, 15);

    // Título
    pdf.setFontSize(12);
    pdf.setTextColor(59, 130, 246);
    pdf.text('AUDIT FLOW BR - RELATÓRIO DE AUDITORIA', config.margins.left, 10);

    // Data de geração
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128); // gray-500
    const now = new Date().toLocaleString('pt-BR');
    pdf.text(`Gerado em: ${now}`, pageWidth - config.margins.right - 40, 10);
  }

  /**
   * Adicionar rodapé ao PDF
   */
  private addFooter(
    pdf: jsPDF, 
    config: Required<PDFExportOptions>, 
    currentPage: number, 
    totalPages: number
  ): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const footerY = pageHeight - 10;

    // Linha inferior
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(1);
    pdf.line(config.margins.left, footerY - 5, pageWidth - config.margins.right, footerY - 5);

    // Numeração de páginas
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(`Página ${currentPage} de ${totalPages}`, pageWidth - config.margins.right - 20, footerY);

    // Informações do sistema
    pdf.text('Audit Flow BR © 2025', config.margins.left, footerY);
  }

  /**
   * Adicionar marca d'água
   */
  private addWatermark(pdf: jsPDF, watermark: string): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Configurar texto da marca d'água
    pdf.setFontSize(50);
    pdf.setTextColor(200, 200, 200, 0.3); // Cinza transparente
    
    // Rotacionar e posicionar
    pdf.text(
      watermark,
      pageWidth / 2,
      pageHeight / 2,
      {
        angle: 45,
        align: 'center'
      }
    );
  }

  /**
   * Gerar nome do arquivo baseado nos dados do relatório
   */
  private generateReportFilename(reportData: RelatorioData): string {
    const condominio = reportData.condominio.nome
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    const periodo = `${reportData.periodo.mes.toString().padStart(2, '0')}-${reportData.periodo.ano}`;
    const timestamp = new Date().toISOString().slice(0, 10);
    
    return `relatorio-auditoria-${condominio}-${periodo}-${timestamp}.pdf`;
  }
}

/**
 * Instância singleton do exportador
 */
export const pdfExporter = new PDFExporter();

/**
 * Hook para exportação de PDFs
 */
export function usePDFExport() {
  const exportToPDF = async (
    elementId: string, 
    options: Partial<PDFExportOptions> = {}
  ): Promise<PDFExportResult> => {
    const loadingToast = toast.loading('Gerando PDF...', {
      description: 'Preparando documento para exportação'
    });

    try {
      const result = await pdfExporter.exportElementToPDF(elementId, options);
      
      toast.dismiss(loadingToast);
      
      if (result.success) {
        toast.success('PDF exportado com sucesso!', {
          description: `${result.filename} (${(result.size / 1024).toFixed(1)} KB, ${result.pages} página${result.pages > 1 ? 's' : ''})`
        });
      } else {
        toast.error('Erro ao exportar PDF', {
          description: result.error
        });
      }
      
      return result;
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('Erro inesperado na exportação', {
        description: error instanceof Error ? error.message : 'Erro desconhecido'
      });
      
      return {
        success: false,
        filename: options.filename || 'relatorio.pdf',
        size: 0,
        pages: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  };

  const exportReport = async (
    reportData: RelatorioData, 
    options: Partial<PDFExportOptions> = {}
  ): Promise<PDFExportResult> => {
    return pdfExporter.exportReport(reportData, options);
  };

  return {
    exportToPDF,
    exportReport
  };
}
