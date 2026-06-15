import React, { useState } from 'react';
import styles from './HistoryPanel.module.css';

const PLATFORM_ICONS = {
  email: 'ti-mail', whatsapp: 'ti-brand-whatsapp',
  slack: 'ti-brand-slack', x: 'ti-brand-x', linkedin: 'ti-brand-linkedin',
};
const PLATFORM_NAMES = {
  email: 'Email', whatsapp: 'WhatsApp', slack: 'Slack', x: 'X', linkedin: 'LinkedIn',
};

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function HistoryPanel({ drafts, onLoad }) {
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(null);

  const filtered = drafts.filter(d =>
    !search || d.reply?.toLowerCase().includes(search.toLowerCase()) ||
    d.receivedMsg?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (e, text, id) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (drafts.length === 0) {
    return (
      <div className={styles.empty}>
        <i className="ti ti-history" aria-hidden="true"></i>
        <p>No drafts yet.</p>
        <span>Your ghostwritten replies will appear here.</span>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <i className="ti ti-search" aria-hidden="true"></i>
          <input
            className={styles.searchInput}
            placeholder="Search drafts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className={styles.count}>{filtered.length} draft{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <div className={styles.list}>
        {filtered.map(d => (
          <div key={d.id} className={styles.item} onClick={() => onLoad(d)}>
            <div className={styles.itemHeader}>
              <div className={styles.platform}>
                <i className={`ti ${PLATFORM_ICONS[d.platform] || 'ti-message'}`} aria-hidden="true"></i>
                {PLATFORM_NAMES[d.platform] || d.platform}
              </div>
              <div className={styles.time}>{timeAgo(d.createdAt)}</div>
            </div>
            {d.receivedMsg && (
              <div className={styles.received}>
                <span className={styles.receivedLabel}>Received: </span>
                {d.receivedMsg.length > 100 ? d.receivedMsg.slice(0, 100) + '…' : d.receivedMsg}
              </div>
            )}
            <div className={styles.reply}>{d.reply}</div>
            <div className={styles.itemActions}>
              <button
                className={styles.copyBtn}
                onClick={e => handleCopy(e, d.reply, d.id)}
              >
                <i className={`ti ${copied === d.id ? 'ti-check' : 'ti-copy'}`} aria-hidden="true"></i>
                {copied === d.id ? 'Copied' : 'Copy'}
              </button>
              <button className={styles.loadBtn} onClick={() => onLoad(d)}>
                <i className="ti ti-edit" aria-hidden="true"></i>
                Load & edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
