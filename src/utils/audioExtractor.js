import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';

const ffmpeg = new FFmpeg();

/**
 * Extracts audio from a video file completely client-side.
 * @param {File} videoFile - The video file selected by the user.
 * @param {function} onProgress - Callback to update the UI progress bar.
 * @returns {Promise<File>} - The extracted MP3 file.
 */
export const extractAudio = async (videoFile, onProgress) => {
    try {
        // 1. Load the FFmpeg engine if not already loaded
        if (!ffmpeg.loaded) {
            await ffmpeg.load();
        }

        const inputName = 'input.mp4';
        const outputName = 'output.mp3';

        // 2. Write the video file to FFmpeg's virtual memory
        await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

        // 3. Track progress (Log percentage)
        ffmpeg.on('progress', ({ progress }) => {
            if (onProgress) {
                // FFmpeg progress is 0 to 1. Convert to 0-100.
                onProgress(Math.round(progress * 100));
            }
        });

        // 4. Run the extraction command
        // -i: Input file
        // -vn: Video No (Drop the video track)
        // -acodec libmp3lame: Use MP3 codec
        // -q:a 2: High Quality Audio (Variable Bitrate)
        await ffmpeg.exec(['-i', inputName, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', outputName]);

        // 5. Read the result from memory
        const data = await ffmpeg.readFile(outputName);

        // 6. Create a proper File object to send to the backend
        const audioBlob = new Blob([data.buffer], { type: 'audio/mp3' });
        const audioFile = new File([audioBlob], "extracted_audio.mp3", { type: "audio/mp3" });

        return audioFile;

    } catch (error) {
        console.error("FFmpeg Client-Side Error:", error);
        throw new Error("Browser extraction failed. System will attempt server-side fallback.");
    }
};