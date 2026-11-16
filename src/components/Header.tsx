import { FileText } from 'lucide-react';

interface HeaderProps {
  totalLetters: number;
}

export function Header({ totalLetters }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          <FileText className="h-5 w-5 text-blue-700 shrink-0" aria-hidden="true" />
          <span>Pembaca Surat Otomatis</span>
        </a>

        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
        >
          <a
            href="#unggah-dokumen"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Unggah Dokumen
          </a>
          <a
            href="#arsip-surat"
            className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
          >
            Riwayat Arsip
          </a>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <div
            data-testid="archive-counter"
            className="text-sm font-medium text-slate-700 whitespace-nowrap shrink-0"
          >
            <span className="text-slate-500 mr-1.5 hidden sm:inline">Arsip Tersimpan:</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {totalLetters}
            </span>
            <span className="ml-1 text-slate-600">Surat</span>
          </div>
        </div>
      </div>
    </header>
  );
}
