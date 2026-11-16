import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  ACCEPTED_MIME_TYPES,
  normalizeLetterExtraction,
} from './src/utils/letterUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const EXTRACTION_PROMPT = `Anda adalah asisten administrasi dan kearsipan profesional berbahasa Indonesia.
Tugas Anda adalah membaca dokumen surat resmi atau tidak resmi (PDF atau gambar hasil scan/foto) dan mengekstrak seluruh metadata serta isi pentingnya secara akurat dalam bahasa Indonesia yang baku dan jelas.

Aturan ekstraksi:
1. jenisSurat: Pilih salah satu yang paling sesuai dari daftar tepat berikut: "Surat Undangan", "Surat Permohonan", "Surat Edaran", "Surat Tugas", "Surat Pemberitahuan", atau "Lainnya".
2. nomorSurat: Salin nomor surat persis seperti yang tertulis pada dokumen. Jika tidak ditemukan, isi "-".
3. tanggalSurat: Konversi tanggal surat ke format DD-MM-YYYY (contoh: 16-11-2026). Jika tidak tertera sama sekali, isi "-".
4. perihal: Tulis perihal atau judul utama surat secara ringkas dan jelas.
5. pengirim: Tulis nama instansi, organisasi, atau pihak pengirim surat.
6. tujuan: Tulis pihak penerima atau tujuan surat (jika ada beberapa, ringkas dengan jelas).
7. lampiran: Tulis keterangan lampiran yang tertera pada surat, atau isi "-" jika tidak ada lampiran.
8. ringkasan: Tulis 2 hingga 3 kalimat padat dan informatif yang menjelaskan inti maksud surat.
9. poinPenting: Tulis jadwal acara (hari, tanggal, waktu, tempat), tenggat waktu, nominal penting, atau instruksi tindak lanjut khusus yang tercantum. Jika tidak ada, isi "-".`;

async function startServer() {
  const app = express();

  app.use(express.json({ limit: '25mb' }));

  app.post('/api/extract-letter', async (req, res) => {
    try {
      const { base64Data, mimeType, fileName } = req.body ?? {};

      if (!base64Data || typeof base64Data !== 'string') {
        return res.status(400).json({
          error: 'Data file tidak ditemukan. Silakan unggah ulang dokumen surat.',
        });
      }

      if (
        !mimeType ||
        typeof mimeType !== 'string' ||
        !(ACCEPTED_MIME_TYPES as readonly string[]).includes(mimeType)
      ) {
        return res.status(400).json({
          error: 'Format dokumen tidak didukung. Gunakan PDF, JPG, PNG, atau WEBP.',
        });
      }

      const ai = createGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error:
            'Kunci API Gemini belum dikonfigurasi pada server (GEMINI_API_KEY). Anda tetap dapat mengisi form ekstraksi secara manual di panel kanan.',
        });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            {
              text: `${EXTRACTION_PROMPT}\n\nNama file yang diunggah: ${typeof fileName === 'string' ? fileName : 'dokumen-surat'}`,
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              jenisSurat: {
                type: Type.STRING,
                enum: [
                  'Surat Undangan',
                  'Surat Permohonan',
                  'Surat Edaran',
                  'Surat Tugas',
                  'Surat Pemberitahuan',
                  'Lainnya',
                ],
                description: 'Kategori jenis surat.',
              },
              nomorSurat: {
                type: Type.STRING,
                description: 'Nomor surat resmi yang tertera, atau "-" jika tidak ada.',
              },
              tanggalSurat: {
                type: Type.STRING,
                description: 'Tanggal surat dalam format DD-MM-YYYY, atau "-" jika tidak tertera.',
              },
              perihal: {
                type: Type.STRING,
                description: 'Perihal atau judul utama surat.',
              },
              pengirim: {
                type: Type.STRING,
                description: 'Nama instansi, perusahaan, atau pengirim surat.',
              },
              tujuan: {
                type: Type.STRING,
                description: 'Nama atau jabatan pihak tujuan / penerima surat.',
              },
              lampiran: {
                type: Type.STRING,
                description: 'Keterangan lampiran pada surat, isi "-" jika tidak ada.',
              },
              ringkasan: {
                type: Type.STRING,
                description: 'Ringkasan isi surat dalam 2-3 kalimat padat dan jelas.',
              },
              poinPenting: {
                type: Type.STRING,
                description: 'Jadwal acara, tenggat waktu, atau instruksi tindak lanjut khusus.',
              },
            },
            required: [
              'jenisSurat',
              'nomorSurat',
              'tanggalSurat',
              'perihal',
              'pengirim',
              'tujuan',
              'lampiran',
              'ringkasan',
              'poinPenting',
            ],
          },
        },
      });

      const rawText = (response.text ?? '').trim();
      if (!rawText) {
        return res.status(502).json({
          error:
            'Model AI tidak mengembalikan teks hasil pembacaan. Pastikan dokumen surat terlihat jelas dan tidak terenkripsi.',
        });
      }

      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        return res.status(502).json({
          error: 'Format respons AI tidak valid. Silakan coba unggah ulang dokumen.',
        });
      }

      const normalized = normalizeLetterExtraction(parsed);
      return res.json({ data: normalized });
    } catch (err: unknown) {
      console.error('Error extracting letter with Gemini:', err);
      const message =
        err instanceof Error ? err.message : 'Terjadi kesalahan saat menganalisis surat.';

      if (message.includes('API_KEY_INVALID') || message.includes('PERMISSION_DENIED')) {
        return res.status(401).json({
          error:
            'API Key Gemini tidak valid atau tidak memiliki izin. Periksa pengaturan Secrets pada panel AI Studio.',
        });
      }

      if (message.includes('RESOURCE_EXHAUSTED') || message.includes('429')) {
        return res.status(429).json({
          error:
            'Batas kuota permintaan Gemini API tercapai sementara. Silakan tunggu beberapa saat lalu coba lagi.',
        });
      }

      return res.status(500).json({
        error:
          'Gagal menganalisis dokumen dengan AI. Pastikan format dokumen jelas atau lengkapi form secara manual.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Pembaca Surat Otomatis berjalan di http://localhost:${PORT}`);
  });
}

startServer();
