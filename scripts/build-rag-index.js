import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const apiKey = process.env.VITE_API_KEY || process.env.API_KEY;
if (!apiKey) {
  console.error("Error: API Key is missing.");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });

const DATA_DIR = path.resolve(process.cwd(), 'data');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const OUTPUT_FILE = path.join(PUBLIC_DIR, 'legal_corpus_index.json');

// --- Helper: Chunk Text ---
function chunkText(text, sourceFilename, chunkSize = 1000, overlap = 200) {
    const chunks = [];
    let startIndex = 0;
    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return [];

    while (startIndex < cleanText.length) {
        const endIndex = Math.min(startIndex + chunkSize, cleanText.length);
        chunks.push({
            id: `${sourceFilename}-${chunks.length}`,
            title: `${sourceFilename} (Part ${chunks.length + 1})`,
            text: cleanText.substring(startIndex, endIndex)
        });
        startIndex += chunkSize - overlap;
    }
    return chunks;
}

// --- Helper: Process File ---
async function processFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const filename = path.basename(filePath);
    let text = "";

    try {
        if (ext === '.pdf') {
            const dataBuffer = fs.readFileSync(filePath);
            const data = await pdf(dataBuffer);
            text = data.text;
        } else if (ext === '.txt') {
            text = fs.readFileSync(filePath, 'utf-8');
        } else {
            console.warn(`Skipping ${filename} (unsupported)`);
            return [];
        }
        if (!text || !text.trim()) return [];
        return chunkText(text, filename);
    } catch (err) {
        console.error(`Error processing ${filename}:`, err.message);
        return [];
    }
}

// --- Helper: Delay ---
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function generateIndex() {
    console.log("--- Local RAG Index Builder (Fixed) ---");

    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR);
        console.log(`[INFO] Created 'data' folder.`);
        return;
    }

    const files = fs.readdirSync(DATA_DIR);
    console.log(`Found ${files.length} files.`);
    const allChunks = [];

    for (const file of files) {
        if (file.startsWith('.')) continue;
        const fileChunks = await processFile(path.join(DATA_DIR, file));
        allChunks.push(...fileChunks);
        console.log(`- ${file}: ${fileChunks.length} chunks.`);
    }

    if (allChunks.length === 0) {
        console.log("No text found to index.");
        return;
    }

    console.log(`\nEmbedding ${allChunks.length} chunks...`);
    const output = [];
    const CONCURRENT_REQUESTS = 5; 

    for (let i = 0; i < allChunks.length; i += CONCURRENT_REQUESTS) {
        const batch = allChunks.slice(i, i + CONCURRENT_REQUESTS);
        
        const promises = batch.map(async (chunk) => {
            try {
                // FIXED: Using 'contents' (plural) with a simple string
                const response = await ai.models.embedContent({
                    model: "text-embedding-004",
                    contents: chunk.text, 
                });
                
                // New SDK response structure often puts values in embeddings[0] or embedding
                const values = response.embeddings?.[0]?.values || response.embedding?.values;

                if (values) {
                    return {
                        id: chunk.id,
                        title: chunk.title,
                        text: chunk.text,
                        embedding: values
                    };
                }
            } catch (e) {
                console.error(`\n[Error] Chunk ${chunk.id}: ${e.message}`);
            }
            return null;
        });

        const results = await Promise.all(promises);
        output.push(...results.filter(r => r !== null));
        process.stdout.write(`.`);
        await delay(200); 
    }

    if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));
    console.log(`\n\nSuccess! Saved ${output.length} vectors to: ${OUTPUT_FILE}`);
}

generateIndex();