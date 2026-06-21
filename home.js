/**
 * Buddyz Quiz — home.js v2.0
 * Dashboard: past quizzes, ranked leaderboard with tiers, share sheet, delete.
 */

document.addEventListener('DOMContentLoaded', () => {
  const boardContainer  = document.getElementById('result-board-container');
  const sectionLabel    = document.getElementById('section-label');
  const quizCountEl     = document.getElementById('quiz-count');

  if (!boardContainer) return;

  /* index.html and bffchallenge.html were merged into one page.
     If this load is a friend opening a shared quiz link (?id=...),
     this is the friend-taking-quiz view, not the creator's history
     dashboard — skip rendering entirely so it doesn't show on top
     of (or instead of) the quiz they're here to take. */
  if (new URLSearchParams(window.location.search).get('id')) {
    return;
  }

  /* ── Local Storage Helpers ─────────────────────────────── */
  function getStoredQuizzes(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch { return {}; }
  }

  function removeQuizLocally(quizID) {
    const created = getStoredQuizzes('createdQuizzes');
    const saved   = getStoredQuizzes('savedQuizzes');
    delete created[quizID];
    delete saved[quizID];
    localStorage.setItem('createdQuizzes', JSON.stringify(created));
    localStorage.setItem('savedQuizzes',   JSON.stringify(saved));
  }

  /* ── Toast Notification ─────────────────────────────────── */
  function showToast(msg, type = '') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast${type ? ' ' + type : ''}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.style.opacity = '0', 2200);
    setTimeout(() => t.remove(), 2600);
  }

  /* ── Tier Logic ─────────────────────────────────────────── */
  function getTier(score, max) {
    if (!max) return { label: '—', icon: '❓', cls: 'tier-acquaintance' };
    const pct = score / max;
    if (pct >= 0.9) return { label: 'Certified Bestie 🥇', icon: '👑', cls: 'tier-certified' };
    if (pct >= 0.7) return { label: 'True Friend',         icon: '🤝', cls: 'tier-bestie' };
    if (pct >= 0.5) return { label: 'Close Buddy',         icon: '😊', cls: 'tier-close' };
    return                 { label: 'Acquaintance',         icon: '👋', cls: 'tier-acquaintance' };
  }

  /* ── Copy to Clipboard ──────────────────────────────────── */
  function copyText(text, label = 'Link') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => showToast(`${label} copied! 🎉`, 'success'))
        .catch(() => fallbackCopy(text, label));
    } else {
      fallbackCopy(text, label);
    }
  }

  function fallbackCopy(text, label) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0;';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      showToast(`${label} copied! 🎉`, 'success');
    } catch {
      showToast('Could not copy — please copy manually.', 'error');
    }
    document.body.removeChild(ta);
  }

  /* ── Smart Share Sheet ──────────────────────────────────── */
  function openShareSheet(quizLink, creatorName) {
    const existing = document.getElementById('buddyz-share-sheet');
    if (existing) existing.remove();

    const whatsappMsg = encodeURIComponent(
      `Hey! 👋 I made a Buddyz quiz — answer these questions about me and see how well you know me! 🎯\n${quizLink}`
    );
    const igCaption = `Think you know me? Take my Buddyz quiz! 👀 Link below 👇`;

    const overlay = document.createElement('div');
    overlay.id = 'buddyz-share-sheet';
    overlay.className = 'share-sheet-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Share your quiz');

    overlay.innerHTML = `
      <div class="share-sheet" role="document">
        <div class="share-sheet-handle"></div>
        <p class="share-sheet-title">Share ${creatorName}'s Quiz</p>
        <p class="share-sheet-sub">Send it to your friends — see who knows you best!</p>

        <div class="share-link-box" id="ss-link-box" title="Tap to copy">
          🔗 ${quizLink}
        </div>

        <div class="share-actions-grid">
          <button class="share-action-btn share-btn-whatsapp" id="ss-wa">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </button>
          <button class="share-action-btn share-btn-copy" id="ss-copy">
            <i class="fa-regular fa-copy"></i> Copy Link
          </button>
          <button class="share-action-btn share-btn-instagram" id="ss-ig">
            <i class="fa-brands fa-instagram"></i> Instagram
          </button>
          <button class="share-action-btn share-btn-more" id="ss-more">
            <i class="fa-solid fa-share-nodes"></i> More…
          </button>
        </div>

        <button class="btn btn-outline" id="ss-close" style="max-width:100%; margin-top:0.5rem;">
          Close
        </button>
      </div>
    `;

    document.body.appendChild(overlay);

    // Wire up actions
    overlay.querySelector('#ss-link-box').addEventListener('click', () => copyText(quizLink, 'Link'));
    overlay.querySelector('#ss-copy').addEventListener('click',     () => copyText(quizLink, 'Link'));

    overlay.querySelector('#ss-wa').addEventListener('click', () => {
      window.open(`https://wa.me/?text=${whatsappMsg}`, '_blank', 'noopener');
    });

    overlay.querySelector('#ss-ig').addEventListener('click', () => {
      copyText(quizLink, 'Link');
      showToast('Link copied — paste it in your Instagram bio or story!', 'success');
    });

    overlay.querySelector('#ss-more').addEventListener('click', () => {
      if (navigator.share) {
        navigator.share({ title: `${creatorName}'s Buddyz Quiz`, text: igCaption, url: quizLink })
          .catch(() => {});
      } else {
        copyText(quizLink, 'Link');
      }
    });

    const close = () => {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s';
      setTimeout(() => overlay.remove(), 200);
    };
    overlay.querySelector('#ss-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    // Trap escape
    const onKey = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  }

  /* ── Build a Single Quiz Card ───────────────────────────── */
  function buildQuizCard(quizID, quizData, isCreator) {
    /* index.html and bffchallenge.html are merged into one page now —
       a shared link is just this same page with ?id=<quizID> appended. */
    const quizLink = `${window.location.origin}${window.location.pathname}?id=${quizID}`;

    const card = document.createElement('div');
    card.className = 'quiz-history-card';
    card.dataset.quizId = quizID;

    // ── Header row
    const headerDiv = document.createElement('div');
    headerDiv.className = 'quiz-history-header';
    headerDiv.innerHTML = `
      <div>
        <div class="quiz-history-name">${escapeHTML(quizData.name)}'s Quiz</div>
        <div class="quiz-history-meta">${
          quizData.responses
            ? `${Object.keys(quizData.responses).length} response${Object.keys(quizData.responses).length !== 1 ? 's' : ''}`
            : 'No responses yet'
        }</div>
      </div>
      <div class="quiz-history-actions">
        <button class="btn-icon share-btn" title="Share quiz" aria-label="Share quiz">
          <i class="fa-solid fa-share-nodes"></i>
        </button>
        ${isCreator ? `
          <button class="btn-icon delete-quiz-btn" title="Delete quiz" aria-label="Delete quiz">
            <i class="fa-regular fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
    `;

    // ── Share row (quick copy pill)
    const shareRow = document.createElement('div');
    shareRow.className = 'quiz-share-row';
    shareRow.innerHTML = `
      <span class="copy-pill" title="Tap to copy quiz link">
        <i class="fa-regular fa-copy"></i>
        <span class="copy-pill-text">${quizLink}</span>
      </span>
      <button class="btn-ghost" style="padding:0.4rem 0.85rem; font-size:0.78rem; border-radius:var(--radius-pill); width:auto; max-width:none; background:var(--pink-soft); color:var(--pink); font-family:var(--font-display); font-weight:700; border:none; cursor:pointer;">
        Copy
      </button>
    `;

    // ── Leaderboard table
    const tableWrap = document.createElement('div');

    if (quizData.responses) {
      const entries = Object.entries(quizData.responses)
        .sort(([, a], [, b]) => b.score !== a.score ? b.score - a.score : a.timestamp - b.timestamp);

      const maxScore = quizData.maxScore || 15;

      let rowsHTML = entries.map(([key, r], i) => {
        const rank = i + 1;
        const denom = r.possiblePoints !== undefined ? r.possiblePoints : maxScore;
        const pct  = denom ? Math.round((r.score / denom) * 100) : 0;
        const tier = getTier(r.score, denom);
        const rankCls = rank <= 3 ? ` rank-row-${rank}` : '';
        const rankIcon = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
        const deleteBtnHTML = isCreator ? `
          <td style="text-align:right; padding-right:0.75rem;">
            <button class="delete-btn delete-response-btn"
              data-quiz-id="${quizID}" data-key="${key}"
              title="Remove result" aria-label="Remove result for ${escapeHTML(r.friendName)}">
              <i class="fa-regular fa-circle-xmark"></i>
            </button>
          </td>
        ` : '<td></td>';

        const viewBtn = r.details ? `
          <button class="view-answers-btn" data-key="${key}"
            title="View ${escapeHTML(r.friendName)}'s answers"
            aria-label="View ${escapeHTML(r.friendName)}'s answers">
            <i class="fa-solid fa-eye"></i>
          </button>
        ` : '';

        return `
          <tr class="${rankCls}">
            <td class="rank-cell ${rank <= 3 ? 'rank-' + rank : ''}">${rankIcon}</td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <div style="font-weight:600; font-size:0.88rem;">${escapeHTML(r.friendName)}</div>
                ${viewBtn}
              </div>
              <div style="margin-top:3px;"><span class="tier-badge ${tier.cls}">${tier.icon} ${tier.label}</span></div>
            </td>
            <td>
              <div class="score-bar-wrap">
                <div class="score-bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
                  <div class="score-bar-fill" style="width:${pct}%"></div>
                </div>
                <span class="score-text">${r.score}/${denom}</span>
              </div>
            </td>
            ${deleteBtnHTML}
          </tr>
        `;
      }).join('');

      tableWrap.innerHTML = `
        <div class="result-table-container" style="border-top:1px solid var(--border);">
          <table class="leaderboard-table" aria-label="Quiz leaderboard">
            <thead>
              <tr>
                <th>#</th>
                <th>Friend</th>
                <th>Score</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rowsHTML}</tbody>
          </table>
        </div>
      `;
    } else {
      tableWrap.innerHTML = `
        <div style="padding:1.25rem 1.25rem; text-align:center;">
          <p style="font-size:0.85rem; color:var(--text-muted);">No one has taken this quiz yet.<br>Share the link and challenge your friends! 🎯</p>
        </div>
      `;
    }

    card.appendChild(headerDiv);
    card.appendChild(shareRow);
    card.appendChild(tableWrap);

    // ── Wire up events
    headerDiv.querySelector('.share-btn').addEventListener('click', () => {
      openShareSheet(quizLink, quizData.name);
    });

    shareRow.querySelector('.copy-pill').addEventListener('click', () => copyText(quizLink, 'Link'));
    shareRow.querySelector('.btn-ghost').addEventListener('click', () => copyText(quizLink, 'Link'));

    // View answers
    tableWrap.querySelectorAll('.view-answers-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const entry = Object.entries(quizData.responses).find(([key]) => key === btn.dataset.key);
        if (entry && typeof openAnswerDetailSheet === 'function') {
          window.creatorName = quizData.name; // Set global for image sharing
          openAnswerDetailSheet(entry[1]);
        }
      });
    });

    if (isCreator) {
      const delQuizBtn = headerDiv.querySelector('.delete-quiz-btn');
      if (delQuizBtn) {
        delQuizBtn.addEventListener('click', () => {
          if (!confirm(`Delete "${quizData.name}'s Quiz" permanently? This cannot be undone.`)) return;
          delQuizBtn.disabled = true;
          Promise.all([
            database.ref('quizzes/' + quizID).remove(),
          ]).then(() => {
            removeQuizLocally(quizID);
            card.style.transition = 'opacity 0.3s, transform 0.3s';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => {
              card.remove();
              refreshCountLabel();
            }, 300);
            showToast('Quiz deleted.', '');
          }).catch(() => {
            showToast('Could not delete. Try again.', 'error');
            delQuizBtn.disabled = false;
          });
        });
      }
    }

    // Delete individual response
    tableWrap.querySelectorAll('.delete-response-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const qid = btn.dataset.quizId;
        const key = btn.dataset.key;
        if (!confirm('Remove this result?')) return;
        btn.disabled = true;
        database.ref(`quizzes/${qid}/responses/${key}`).remove()
          .then(() => {
            const row = btn.closest('tr');
            if (row) {
              row.style.transition = 'opacity 0.25s';
              row.style.opacity = '0';
              setTimeout(() => row.remove(), 250);
            }
            showToast('Result removed.', '');
          })
          .catch(() => { showToast('Error removing result.', 'error'); btn.disabled = false; });
      });
    });

    return card;
  }

  /* ── Escape HTML ─────────────────────────────────────────── */
  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── Refresh count label ────────────────────────────────── */
  function refreshCountLabel() {
    const cards = boardContainer.querySelectorAll('.quiz-history-card');
    if (quizCountEl) quizCountEl.textContent = cards.length ? `${cards.length} quiz${cards.length !== 1 ? 'zes' : ''}` : '';
  }

  /* ── Main: Load & Render ────────────────────────────────── */
  function displayQuizzes() {
    const createdQuizzes = getStoredQuizzes('createdQuizzes');
    const savedQuizzes   = getStoredQuizzes('savedQuizzes');
    const allIDs = [...new Set([...Object.keys(createdQuizzes), ...Object.keys(savedQuizzes)])];

    if (allIDs.length === 0) {
      // Show nothing — the hero card is already on the page
      return;
    }

    // Show section label
    if (sectionLabel) sectionLabel.style.display = 'flex';

    boardContainer.style.display = 'flex';

    // Show skeletons while loading
    boardContainer.innerHTML = allIDs.map(() =>
      `<div class="skeleton skel-card"></div>`
    ).join('');

    const promises = allIDs.map(quizID =>
      database.ref('quizzes/' + quizID).once('value').then(snap => ({ quizID, data: snap.val() }))
    );

    Promise.all(promises).then(results => {
      boardContainer.innerHTML = '';

      const now = Date.now();
      let renderedCount = 0;

      results
        /* Newest first — fall back to 0 for quizzes created before
           `createdAt` existed (they sink to the bottom). */
        .sort((a, b) => ((b.data && b.data.createdAt) || 0) - ((a.data && a.data.createdAt) || 0))
        .forEach(({ quizID, data }) => {
          if (!data) {
            // Stale local reference — clean up silently
            removeQuizLocally(quizID);
            return;
          }

          /* Expired quizzes (7 days old) no longer appear in history.
             We only remove the local reference here — the underlying
             Firebase data is left untouched in case it's needed later. */
          if (data.expiresAt && now > data.expiresAt) {
            removeQuizLocally(quizID);
            return;
          }

          const isCreator = !!createdQuizzes[quizID];
          const card = buildQuizCard(quizID, data, isCreator);
          boardContainer.appendChild(card);
          renderedCount++;
        });

      if (renderedCount === 0) {
        if (sectionLabel) sectionLabel.style.display = 'none';
        boardContainer.style.display = 'none';
      } else {
        if (quizCountEl) quizCountEl.textContent = `${renderedCount} quiz${renderedCount !== 1 ? 'zes' : ''}`;
      }
    }).catch(err => {
      console.error('Buddyz: error loading quizzes', err);
      boardContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <div class="empty-state-title">Couldn't load quizzes</div>
          <div class="empty-state-sub">Check your connection and refresh the page.</div>
        </div>
      `;
    });
  }

  displayQuizzes();
});
