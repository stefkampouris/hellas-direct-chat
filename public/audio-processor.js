// public/audio-processor.js - AudioWorklet processor for real-time audio streaming
class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096;
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.sampleRate = 16000; // Target sample rate for Dialogflow
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (input.length > 0) {
      const inputChannel = input[0];
      
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex] = inputChannel[i];
        this.bufferIndex++;
        
        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Convert Float32Array to Int16Array for Dialogflow
          const int16Buffer = this.float32ToInt16(this.buffer);
          
          // Send processed audio data to main thread
          this.port.postMessage({
            type: 'audioData',
            data: int16Buffer,
            sampleRate: this.sampleRate,
            timestamp: currentTime
          });
          
          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }
    
    // Keep processor running
    return true;
  }
  
  // Convert Float32Array to Int16Array for Dialogflow
  float32ToInt16(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Convert from [-1, 1] to [-32768, 32767]
      let val = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
    }
    return int16Array;
  }
}

registerProcessor('audio-processor', AudioProcessor);
