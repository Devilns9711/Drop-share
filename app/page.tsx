'use client';

import { useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, Check, CheckCircle2, Copy, FileImage, FileVideo, Link2, LoaderCircle, LockKeyhole, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import { getSupabase, BUCKET } from '@/lib/supabase';

type Picked = { file: File; id: string; preview?: string };
const MAX_FILE_SIZE = 100 * 1024 * 1024;
const MAX_FILES = 20;

function prettyBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);

  function addFiles(list: FileList | File[]) {
    setError(''); setShareUrl('');
    const incoming = Array.from(list);
    const allowed = incoming.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    const tooBig = allowed.find(f => f.size > MAX_FILE_SIZE);
    if (incoming.length !== allowed.length) setError('Only image and video files are supported.');
    if (tooBig) { setError(`${tooBig.name} is larger than the 100 MB per-file limit.`); return; }
    setFiles(old => {
      const merged = [...old, ...allowed.map(file => ({ file, id: crypto.randomUUID(), preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined }))];
      if (merged.length > MAX_FILES) { setError(`You can share up to ${MAX_FILES} files at once.`); return old; }
      return merged;
    });
  }

  function removeFile(id: string) {
    setFiles(old => { const item = old.find(f => f.id === id); if (item?.preview) URL.revokeObjectURL(item.preview); return old.filter(f => f.id !== id); });
  }

  async function createShare() {
    if (!files.length || busy) return;
    setBusy(true); setError(''); setShareUrl('');
    const shareId = crypto.randomUUID();
    try {
      const supabase = getSupabase();
      const rows = [];
      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        setProgress(`Uploading ${i + 1} of ${files.length} · ${item.file.name}`);
        const safeName = item.file.name.normalize('NFKC').replace(/[^\w.() -]/g, '_').slice(0, 150) || 'file';
        const path = `${shareId}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, item.file, { contentType: item.file.type || 'application/octet-stream', upsert: false, cacheControl: '3600' });
        if (uploadError) throw new Error(uploadError.message);
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        rows.push({ share_id: shareId, file_name: item.file.name, file_path: path, public_url: data.publicUrl, mime_type: item.file.type, size_bytes: item.file.size });
      }
      const { error: dbError } = await supabase.from('shared_files').insert(rows);
      if (dbError) throw new Error(dbError.message);
      const url = `${window.location.origin}/share/${shareId}`;
      setShareUrl(url); setProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.');
      setProgress('');
    } finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Could not copy automatically. Select and copy the link above.'); }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="/"><span className="brand-mark"><Link2 size={21}/></span><span>drop<span className="brand-light">share</span></span></a><div className="top-note"><span className="status-dot"/> Original quality. Always.</div></header>
    <section className="hero"><div className="eyebrow"><Sparkles size={14}/> YOUR FILES, YOUR WAY</div><h1>Big memories.<br/><span>One simple link.</span></h1><p className="hero-copy">Share photos and videos without losing the details. Upload once, send a link, and let anyone download the original files.</p>
      <div className={`dropzone ${dragging ? 'dragging' : ''} ${files.length ? 'has-files' : ''}`} onDragOver={e => {e.preventDefault();setDragging(true);}} onDragLeave={() => setDragging(false)} onDrop={e => {e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}>
        <input ref={inputRef} type="file" accept="image/*,video/*" multiple hidden onChange={e => {if(e.target.files) addFiles(e.target.files);e.currentTarget.value='';}}/>
        <div className="upload-icon"><UploadCloud size={28}/></div><h2>Drop your files here</h2><p>or <button className="inline-link" onClick={() => inputRef.current?.click()}>browse from your device</button></p><div className="file-rules"><span><FileImage size={14}/> Photos</span><span><FileVideo size={14}/> Videos</span><span>Up to 100 MB each</span></div>
      </div>
      {files.length > 0 && <section className="file-panel"><div className="file-panel-heading"><div><h3>Ready to share</h3><p>{files.length} file{files.length === 1 ? '' : 's'} · {prettyBytes(files.reduce((sum, f) => sum + f.file.size, 0))} total</p></div><button className="clear-btn" onClick={() => {files.forEach(f => f.preview && URL.revokeObjectURL(f.preview));setFiles([]);setShareUrl('');setError('');}}>Clear all</button></div><div className="file-list">{files.map(item => <div className="file-row" key={item.id}><div className="file-thumb">{item.preview ? <img src={item.preview} alt=""/> : item.file.type.startsWith('video/') ? <FileVideo size={22}/> : <FileImage size={22}/>}</div><div className="file-info"><strong title={item.file.name}>{item.file.name}</strong><span>{prettyBytes(item.file.size)} · {item.file.type.startsWith('video/') ? 'Video' : 'Image'}</span></div><button className="remove-btn" aria-label={`Remove ${item.file.name}`} onClick={() => removeFile(item.id)} disabled={busy}><X size={17}/></button></div>)}</div>
        {!shareUrl ? <button className="primary-btn" disabled={busy || !files.length} onClick={createShare}>{busy ? <><LoaderCircle className="spin" size={18}/>{progress || 'Uploading…'}</> : <>Create share link <ArrowRight size={18}/></>}</button> : <div className="share-success"><div className="success-heading"><CheckCircle2 size={20}/><div><strong>Your link is ready</strong><span>Anyone with this link can view and download these files.</span></div></div><div className="share-url"><input readOnly value={shareUrl} onFocus={e => e.currentTarget.select()}/><button onClick={copyLink}>{copied ? <Check size={17}/> : <Copy size={17}/>} {copied ? 'Copied' : 'Copy link'}</button></div><a className="open-link" href={shareUrl} target="_blank" rel="noreferrer">Open share page <ArrowRight size={15}/></a></div>}</section>}
      {error && <div className="error-message" role="alert"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss"><X size={16}/></button></div>}
    </section>
    <section className="benefits"><div className="benefit"><div className="benefit-icon"><ShieldCheck size={19}/></div><div><strong>No quality loss</strong><p>Files stay exactly as uploaded.</p></div></div><div className="benefit"><div className="benefit-icon"><Link2 size={19}/></div><div><strong>One link for everyone</strong><p>No account needed to download.</p></div></div><div className="benefit"><div className="benefit-icon"><ArrowDownToLine size={19}/></div><div><strong>Easy downloads</strong><p>Save original files to any device.</p></div></div></section>
    <footer><span>Made for sharing, not compressing.</span><span><LockKeyhole size={13}/> Links are public to anyone who has them</span></footer>
  </main>;
}
