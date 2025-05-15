const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const { v4: uuid } = require('uuid');

const app = express();
app.use(express.json());

app.post('/convert', async (req, res) => {
  const { videoUrl } = req.body;
  const id = uuid();
  const inputPath = `/tmp/input_${id}.mp4`;
  const outputPath = `/tmp/output_${id}.mp4`;

  try {
    console.log('Downloading video:', videoUrl);
    const writer = fs.createWriteStream(inputPath);
    const response = await axios({ url: videoUrl, method: 'GET', responseType: 'stream' });
    await new Promise((resolve) => response.data.pipe(writer).on('finish', resolve));

    const cmd = `ffmpeg -i ${inputPath} -vf "scale=w=if(gt(a,16/9),1920,trunc(1080*a/2)*2):h=if(gt(a,16/9),trunc(1920/a/2)*2,1080),pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -y ${outputPath}`;
    console.log('Running FFmpeg command:', cmd);
    await new Promise((resolve, reject) => {
      exec(cmd, (err) => (err ? reject(err) : resolve()));
    });

    console.log('Sending file:', outputPath);
    res.sendFile(outputPath);
  } catch (e) {
    console.error('Conversion failed:', e.message);
    res.status(500).json({ error: e.message });
  } finally {
    setTimeout(() => {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    }, 60000);
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));