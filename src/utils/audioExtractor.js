import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

export const extractAudio = async (videoFile, onProgress) => {
    try {
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        const outputName = 'output.mp3'; 

        // Write file to memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // Track progress
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) onProgress(Math.round(progress * 100));
        });

        // --- DYNAMIC FILENAME LOGIC ---
        const originalName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.')) || videoFile.name;
        const finalFileName = `${originalName}.mp3`;

        // --- STRATEGY: TRY STREAM COPY FIRST (INSTANT), FALLBACK TO FAST ENCODE ---
        try {
            console.log("🚀 Attempting High-Speed Stream Copy...");
            // Try to just copy the audio stream (Fastest possible)
            await ffmpeg.exec(['-i', inputName, '-vn', '-c:a', 'copy', outputName]);
        } catch (copyError) {
            console.warn("Stream copy failed. Falling back to Optimized Encode.", copyError);
            
            // Fallback: Optimized Speech Settings (Fast & Small)
            await ffmpeg.exec([
                '-i', inputName, 
                '-vn', 
                '-ac', '1', 
                '-ar', '16000',
                '-b:a', '64k', 
                outputName
            ]);
        }

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // Create the file object
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], finalFileName, { type: "audio/mp3" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};