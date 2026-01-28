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

        // --- OPTIMIZED SPEECH EXTRACTION ---
        // -vn: No Video
        // -ac 1: Downmix to Mono (Reduces size by 50%)
        // -ar 16000: Set Sample Rate to 16kHz (Perfect for Speech AI)
        // -b:a 64k: Set Bitrate to 64k (Small file, high speech clarity)
        // -codec:a libmp3lame: Standard MP3 encoding
        console.log("🚀 Starting Optimized Speech Extraction...");
        
        await ffmpeg.exec([
            '-i', inputName, 
            '-vn', 
            '-ac', '1', 
            '-ar', '16000',
            '-b:a', '64k',
            '-codec:a', 'libmp3lame',
            outputName
        ]);

        // Read the result
        const data = await ffmpeg.readFile(outputName);

        // Create the file object
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], "optimized_audio.mp3", { type: "audio/mp3" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Error:", error);
        throw new Error("Extraction failed.");
    }
};