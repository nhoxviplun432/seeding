'use client';

import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { videoAPI } from '@/lib/api';

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {'video/*': ['.mp4', '.mov', '.avi']},
    maxFiles: 1,
    onDrop: (files) => setFile(files[0])
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);

    try {
      const result = await videoAPI.upload(formData);
      alert(`Video uploaded! ID: ${result.video_id}`);
      setFile(null);
      setTitle('');
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto p-6">
      <div {...getRootProps()} className="border-2 border-dashed p-8 text-center">
        <input {...getInputProps()} />
        <p>{file ? file.name : 'Drag video here or click to select'}</p>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Video title"
        className="w-full mt-4 p-2 border rounded"
        required
      />

      <button
        type="submit"
        disabled={uploading || !file}
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded disabled:bg-gray-300"
      >
        {uploading ? 'Uploading...' : 'Upload Video'}
      </button>
    </form>
  );
}