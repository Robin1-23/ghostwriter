import React, { useState } from 'react';
import styles from './VaultPanel.module.css';

export default function VaultPanel({ vault, addVaultItem, deleteVaultItem }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setLoading(true);
    setError('');
    try {
      await addVaultItem(title.trim(), content.trim());
      setTitle('');
      setContent('');
    } catch (err) {
      console.error(err);
      setError('Failed to add reference. Please try again.');
    }
    setLoading(false);
  };

  return (
    <div className={styles.layout}>
      {/* Add Item form */}
      <div className={styles.formCol}>
        <div className={styles.sectionLabel}>Add Reference Document</div>
        <form className={styles.card} onSubmit={handleAdd}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Document Title</label>
            <input
              type="text"
              className={styles.textInput}
              placeholder="e.g. Company Pricing Rate Sheet, Personal Bio"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Reference Content</label>
            <textarea
              className={styles.textarea}
              placeholder="Paste FAQ questions, pricing rates, bios, specifications, or rules Ghost should refer to when drafting replies…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              required
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? (
              <><i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }}></i> Saving...</>
            ) : (
              <><i className="ti ti-plus"></i> Save to Vault</>
            )}
          </button>
          {error && <div className={styles.error}><i className="ti ti-alert-circle"></i> {error}</div>}
        </form>
      </div>

      {/* List vault items */}
      <div className={styles.listCol}>
        <div className={styles.sectionLabel}>Active Vault Items ({vault.length})</div>
        <div className={styles.listContainer}>
          {vault.length === 0 ? (
            <div className={styles.emptyState}>
              <i className="ti ti-database-off"></i>
              <p>Your Knowledge Vault is empty.</p>
              <span>Add FAQs, rate cards, or personal descriptions to automatically inject factual accuracy into your AI drafts.</span>
            </div>
          ) : (
            vault.map((item) => (
              <div key={item.id} className={styles.vaultCard}>
                <div className={styles.vaultHeader}>
                  <span className={styles.vaultTitle}>{item.title}</span>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => deleteVaultItem(item.id)}
                    title="Delete item"
                  >
                    <i className="ti ti-trash"></i>
                  </button>
                </div>
                <div className={styles.vaultContent}>{item.content}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
