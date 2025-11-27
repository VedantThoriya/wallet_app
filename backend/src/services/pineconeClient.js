import { Pinecone } from "@pinecone-database/pinecone";
import "dotenv/config";

if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is missing in .env");
}

if (!process.env.PINECONE_INDEX_NAME) {
    throw new Error("PINECONE_INDEX_NAME is missing in .env");
}

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

export const pineconeIndex = pinecone.index(process.env.PINECONE_INDEX_NAME);
