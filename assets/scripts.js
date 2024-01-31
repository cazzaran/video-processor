/**
 * Loads a non module JS file.
 * @param {string} src URL to the JS file
 * @param {Object} attrs additional optional attributes
 */

async function loadScript(src, attrs) {
  return new Promise((resolve, reject) => {
    if (!document.querySelector(`head > script[src="${src}"]`)) {
      const script = document.createElement('script');
      script.src = src;
      if (attrs) {
        // eslint-disable-next-line no-restricted-syntax, guard-for-in
        for (const attr in attrs) {
          script.setAttribute(attr, attrs[attr]);
        }
      }
      script.onload = resolve;
      script.onerror = reject;
      document.head.append(script);
    } else {
      resolve();
    }
  });
}

/**
 * Helper function to create DOM elements
 * @param {string} tag DOM element to be created
 * @param {array} attributes attributes to be added
 */
function createTag(tag, attributes, html) {
  const el = document.createElement(tag);
  if (html) {
    if (html instanceof HTMLElement || html instanceof SVGElement) {
      el.append(html);
    } else {
      el.insertAdjacentHTML('beforeend', html);
    }
  }
  if (attributes) {
    Object.entries(attributes).forEach(([key, val]) => {
      el.setAttribute(key, val);
    });
  }
  return el;
}

function setPreview(type, buffer, name) {

}

function init() {
  const formEl = document.querySelector('#upload-pane');
  const uploadEl = formEl.querySelector('#upload');
  const dropzoneEl = formEl.querySelector('#dropzone');
  const previewEl = document.querySelector('#preview-pane');
  const runButtonEl = document.querySelector('#run');
  const dialogEl = document.querySelector('dialog');
  
  uploadEl.addEventListener('change', async (e) => {
    uploadEl.setAttribute('disabled', true);
    
    dropzoneEl.querySelector('label').classList.add('hide');
    const filenameEl = dropzoneEl.querySelector('#filename');
    filenameEl.classList.add('show');
    dropzoneEl.classList.add('flatten');
    const filename = e.target.files[0].name.split(/(\\|\/)/g).pop();
    filenameEl.innerHTML = (filename.length > 15) ? `${filename.substring(0, 13)}...` : filename;
  });

  runButtonEl.addEventListener('click', async (e) => {
    e.preventDefault();
    const uploadEl = formEl.querySelector('#upload');
    if (uploadEl.files && uploadEl.files[0]) {
      dialogEl.showModal();
      const file = uploadEl.files[0];
      const bitrate = formEl.querySelector('#bitrate').value;
      const { name, size } = file;
      const progressBarEl = dialogEl.querySelector('.progress');
      // eslint-disable-next-line no-undef
      const { fetchFile } = FFmpegUtil;
      // eslint-disable-next-line no-undef
      const { FFmpeg } = FFmpegWASM;
      let ffmpeg = null;
      // eslint-disable-next-line no-unused-vars
      let kB = Math.floor(size / 1024);
      if (ffmpeg === null) {
        ffmpeg = new FFmpeg();
        ffmpeg.on('progress', ({ progress }) => {
          if (progressBarEl) progressBarEl.style.width = `${Math.floor(progress * 100)}%`;
        });
        await ffmpeg.load({
          coreURL: '/video-processor/assets/core/package/dist/umd/ffmpeg-core.js',
        });
      }
      
      await ffmpeg.writeFile(name, await fetchFile(file));
      await ffmpeg.exec(['-i', name, '-b:v', `${bitrate}k`, 'output.mp4']);
      const data = await ffmpeg.readFile('output.mp4');
      dialogEl.close();

      formEl.setAttribute('aria-hidden', true)
      previewEl.setAttribute('aria-hidden', false)

      const params = {};
      params.controls = true;
      const videoEl = createTag('video', params, createTag('source', {
        src: URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' })),
        type: 'video/mp4',
        'data-name': name,
      }));
      previewEl.append(videoEl);
      const videoSrc = videoEl.querySelector('source').src;
      const videoResp = await fetch(videoSrc);
      const videoBlob = await videoResp.blob();
      const videoURL = URL.createObjectURL(videoBlob);
      const newFilename = `new-${videoEl.querySelector('source').dataset.name}`;
      const downloadLinkEl = createTag('a', {
        id: 'download',
        href: videoURL,
        download: newFilename,
      }, newFilename);
      previewEl.append(downloadLinkEl);
      
    } else {
      alert('You need to provide a file');
    }





  });
  runButtonEl.removeAttribute('disabled');
}

window.addEventListener('load', (event) => {
  // Prevent the closing of the dialog
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
    }
  });
  init();
});