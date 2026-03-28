// Minimal Supabase-backed front-end logic for Task Manager (browser)
const sb = window.supabase;

// Simple auth UI
async function showAuth(){
  const authArea = document.getElementById('authArea');
  authArea.innerHTML = `
    <div>
      <input id="email" placeholder="you@example.com" style="padding:8px;margin-right:8px"><input id="pw" placeholder="password" type="password" style="padding:8px;margin-right:8px">
      <button id="signin">Sign in</button>
      <button id="signup">Create</button>
      <span class="small-muted" style="margin-left:12px">(use simple test account)</span>
    </div>`;

  const signinBtn = document.getElementById('signin');
  const signupBtn = document.getElementById('signup');
  document.getElementById('signin').addEventListener('click', async ()=>{
    signinBtn.disabled = true;
    const e=document.getElementById('email').value; const p=document.getElementById('pw').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error){ alert('Sign-in failed: '+error.message); signinBtn.disabled = false; return; }
    initApp();
  });
  document.getElementById('signup').addEventListener('click', async ()=>{
    signupBtn.disabled = true;
    const e=document.getElementById('email').value; const p=document.getElementById('pw').value;
    const { data, error } = await sb.auth.signUp({ email: e, password: p });
    if(error){ alert('Sign-up failed: '+error.message); // re-enable after 60s to prevent immediate re-tries
      setTimeout(()=>{ signupBtn.disabled=false; }, 60000); return; }
    alert('Sign-up OK — check email if verification required. Then sign in.');
    setTimeout(()=>{ signupBtn.disabled=false; }, 60000);
  });
}

async function fetchTasks(){ const { data, error } = await sb.from('tasks').select('*').order('created_at',{ascending:false}); if(error) { console.error(error); return []; } return data || []; }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

let selectedBucket = 'Today';
function isTodayStr(d){ if(!d) return false; const dt=new Date(d); const now=new Date(); return dt.getFullYear()===now.getFullYear() && dt.getMonth()===now.getMonth() && dt.getDate()===now.getDate(); }
function isTomorrowStr(d){ if(!d) return false; const dt=new Date(d); const t=new Date(); t.setDate(t.getDate()+1); return dt.getFullYear()===t.getFullYear() && dt.getMonth()===t.getMonth() && dt.getDate()===t.getDate(); }
function isThisWeekStr(d){ if(!d) return false; const dt=new Date(d); const now=new Date(); const start = new Date(now); start.setDate(now.getDate() - now.getDay()); start.setHours(0,0,0,0); const end = new Date(start); end.setDate(start.getDate()+7); return dt >= start && dt < end; }

function renderSidebar(tasks){ const bucketList = document.getElementById('bucketList'); const today = tasks.filter(t=> isTodayStr(t.due) || (!t.due && (t.status||'').toLowerCase() !== 'completed')).length; const tomorrow = tasks.filter(t=> isTomorrowStr(t.due)).length; const week = tasks.filter(t=> isThisWeekStr(t.due)).length; const onIce = tasks.filter(t=> ((t.status||'').toLowerCase()==='on ice')).length; const completed = tasks.filter(t=> ((t.status||'').toLowerCase()==='completed')).length;
  bucketList.innerHTML = '';
  const buckets = [ ['Today', today], ['Tomorrow', tomorrow], ['This Week', week], ['On Ice', onIce], ['Completed', completed] ];
  for(const b of buckets){ const btn = document.createElement('div'); btn.className='chip'; btn.style.cursor='pointer'; btn.style.display='flex'; btn.style.justifyContent='space-between'; btn.style.padding='8px'; btn.style.marginBottom='8px'; btn.dataset.bucket = b[0]; btn.innerHTML = `<div>${b[0]}</div><div style="opacity:0.8">${b[1]}</div>`; if(b[0]===selectedBucket) btn.style.boxShadow='inset 0 0 0 2px rgba(96,165,250,0.14)'; btn.addEventListener('click', ()=>{ selectedBucket = b[0]; document.getElementById('mainTitle').innerText = selectedBucket; render(); }); bucketList.appendChild(btn);
    // also populate bottomBuckets (mobile)
    const bottom = document.getElementById('bottomBuckets'); if(bottom){ const bbtn = btn.cloneNode(true); bbtn.style.marginBottom='0'; bbtn.style.flex='1'; bbtn.style.justifyContent='center'; bbtn.style.background='rgba(255,255,255,0.04)'; bbtn.addEventListener('click', ()=>{ selectedBucket = b[0]; document.getElementById('mainTitle').innerText = selectedBucket; render(); }); bottom.appendChild(bbtn); }
  }
}

async function render(){ const tasks = await fetchTasks(); console.log('render: fetched tasks', tasks?tasks.length:0); renderSidebar(tasks); const list = document.getElementById('taskList'); list.innerHTML=''; if(!tasks.length) return list.innerHTML='<div class="small-muted">No tasks</div>';
  // render active tasks first
  const completedTasks = tasks.filter(t => (t.status||'').toLowerCase() === 'completed');
  let activeTasks = tasks.filter(t => (t.status||'').toLowerCase() !== 'completed');
  // apply bucket filter
  if(selectedBucket==='Today'){
    activeTasks = activeTasks.filter(t => isTodayStr(t.due) || (!t.due));
  } else if(selectedBucket==='Tomorrow'){
    activeTasks = activeTasks.filter(t=> isTomorrowStr(t.due));
  } else if(selectedBucket==='This Week'){
    activeTasks = activeTasks.filter(t=> isThisWeekStr(t.due));
  } else if(selectedBucket==='On Ice'){
    activeTasks = activeTasks.filter(t=> (t.status||'').toLowerCase()==='on ice');
  } else if(selectedBucket==='Completed'){
    // show no active tasks in main list for Completed bucket
    activeTasks = [];
  }
  if(activeTasks.length === 0 && completedTasks.length === 0) return list.innerHTML = '<div class="small-muted">No tasks</div>';
  for(const t of activeTasks){ const el=document.createElement('div'); el.className='task-card'; // use CSS for spacing
    const shortNotes = t.notes ? (t.notes.length>80? escapeHtml(t.notes.slice(0,80)) + '…' : escapeHtml(t.notes)) : '';
    el.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <div style="font-weight:700">${escapeHtml(t.title)}</div>
          <div style="font-size:12px;color:var(--muted)">${escapeHtml(t.bucket||'Work')}</div>
        </div>
        <div class="small-muted" style="font-size:13px;margin-top:6px">${escapeHtml(t.status||'Not Started')} • Due: ${escapeHtml(t.due||'—')}</div>
        ${ shortNotes ? `<div style="margin-top:8px;color:var(--muted);font-size:13px">${shortNotes}</div>` : '' }
        <!-- inline editor (hidden by default) -->
        <div class="inline-editor" style="display:none;margin-top:8px;padding:8px;border-top:1px dashed rgba(0,0,0,0.04)">
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input class="edit-title" style="flex:1;padding:6px;border-radius:6px;border:1px solid #e6eef6" value="${escapeHtml(t.title)}">
            <select class="edit-bucket" style="padding:6px;border-radius:6px;border:1px solid #e6eef6">
              <option ${t.bucket==='Work'?'selected':''}>Work</option>
              <option ${t.bucket==='Personal'?'selected':''}>Personal</option>
              <option ${t.bucket==='Family'?'selected':''}>Family</option>
              <option ${t.bucket==='Long-Term'?'selected':''}>Long-Term</option>
            </select>
            <select class="edit-status" style="padding:6px;border-radius:6px;border:1px solid #e6eef6">
              <option ${t.status==='Not Started'?'selected':''}>Not Started</option>
              <option ${t.status==='Active'?'selected':''}>Active</option>
              <option ${t.status==='Blocked'?'selected':''}>Blocked</option>
              <option ${t.status==='On Ice'?'selected':''}>On Ice</option>
              <option ${t.status==='Future Ideas'?'selected':''}>Future Ideas</option>
              <option ${t.status==='Completed'?'selected':''}>Completed</option>
            </select>
          </div>
          <div style="display:flex;gap:8px;margin-top:8px">
            <input type="date" class="edit-due" value="${t.due||''}" style="padding:6px;border-radius:6px;border:1px solid #e6eef6">
            <input type="number" min="0" max="100" class="edit-progress" value="${t.progress||0}" style="width:110px;padding:6px;border-radius:6px;border:1px solid #e6eef6">
            <input class="edit-blocker" placeholder="Blocker" value="${escapeHtml(t.blocker||'')}" style="flex:1;padding:6px;border-radius:6px;border:1px solid #e6eef6">
          </div>
          <div style="margin-top:8px"><textarea class="edit-notes" rows=3 style="width:100%;padding:6px;border-radius:6px;border:1px solid #e6eef6">${escapeHtml(t.notes||'')}</textarea></div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px"><button class="btn ghost save" data-id="${t.id}">💾 Save</button><button class="btn ghost cancel">✖ Cancel</button><button class="btn done-inline" data-id="${t.id}">✅ Done</button></div>
        </div>
      </div>
      <div style="margin-left:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div class="card-actions"><button class="btn ghost" data-action="note" data-id="${t.id}">✎ Edit</button></div>
        ${ t.project ? `<button class="btn ghost" data-action="open-project" data-project="${escapeHtml(t.project)}">📁 Project</button>` : '' }
      </div>`;
    // Attach direct handlers so clicks reliably fire
    const doneBtn = el.querySelector('[data-action="done"]');
    const noteBtn = el.querySelector('[data-action="note"]');
    const moveBtn = el.querySelector('[data-action="move"]');
    if(doneBtn){ doneBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); await updateTask(doneBtn.dataset.id,{status:'Completed',progress:100}); render(); }); }
    if(noteBtn){ noteBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); const editor = el.querySelector('.inline-editor'); if(!editor) return; editor.style.display='block'; const ta = editor.querySelector('.edit-notes'); ta.focus(); }); }
    // editor buttons (save/cancel/done inline)
    const saveBtn = el.querySelector('.inline-editor .save');
    const cancelBtn = el.querySelector('.inline-editor .cancel');
    const doneInlineBtn = el.querySelector('.inline-editor .done-inline');
    if(cancelBtn){ cancelBtn.addEventListener('click', (ev)=>{ ev.stopPropagation(); const editor = el.querySelector('.inline-editor'); if(editor) editor.style.display='none'; }); }
    if(doneInlineBtn){ doneInlineBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); try{ await updateTask(doneInlineBtn.dataset.id,{status:'Completed',progress:100}); const editor = el.querySelector('.inline-editor'); if(editor) editor.style.display='none'; await render(); } catch(e){ alert('Failed to mark done: '+(e.message||e)); } }); }
    if(saveBtn){ saveBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); const editor = el.querySelector('.inline-editor'); const payload = {};
        payload.title = (editor.querySelector('.edit-title').value||'').trim();
        payload.bucket = editor.querySelector('.edit-bucket').value;
        payload.status = editor.querySelector('.edit-status').value;
        const dueVal = editor.querySelector('.edit-due').value; payload.due = dueVal? dueVal : null;
        payload.progress = parseInt(editor.querySelector('.edit-progress').value||0,10);
        payload.blocker = editor.querySelector('.edit-blocker').value || null;
        payload.notes = editor.querySelector('.edit-notes').value || null;
        try{ await updateTask(saveBtn.dataset.id, payload); editor.style.display='none'; await render(); } catch(e){ alert('Save failed: '+(e.message||e)); }
    }); }
    list.appendChild(el);
  }
  // completed items
  if(completedTasks.length>0){ const hdr = document.createElement('div'); hdr.className='section-header'; hdr.innerText='Completed'; hdr.style.marginTop='18px'; list.appendChild(hdr);
    for(const t of completedTasks){ const el=document.createElement('div'); el.className='task-card completed';
      const shortNotes = t.notes ? (t.notes.length>80? escapeHtml(t.notes.slice(0,80)) + '…' : escapeHtml(t.notes)) : '';
      el.innerHTML = `
        <div style="flex:1;min-width:0;opacity:0.7">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <div style="font-weight:700;text-decoration:line-through">${escapeHtml(t.title)}</div>
            <div style="font-size:12px;color:var(--muted)">${escapeHtml(t.bucket||'Work')}</div>
          </div>
          <div class="small-muted" style="font-size:13px;margin-top:6px">${escapeHtml(t.status||'Completed')} • Due: ${escapeHtml(t.due||'—')}</div>
          ${ shortNotes ? `<div style="margin-top:8px;color:var(--muted);font-size:13px">${shortNotes}</div>` : '' }
        </div>
        <div style="margin-left:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <button class="btn ghost" data-action="move" data-id="${t.id}">↔ Move</button>
        </div>`;
      const moveBtn = el.querySelector('[data-action="move"]'); if(moveBtn){ moveBtn.addEventListener('click', async (ev)=>{ ev.stopPropagation(); const newStatus = prompt('Change status', 'Active'); if(newStatus) { await updateTask(newStatus); render(); } }); }
      list.appendChild(el);
    }
  }
}

async function addTask(payload){ const { data, error } = await sb.from('tasks').insert([payload]).select(); if(error) throw error; return data[0]; }
async function updateTask(id, patch){ patch.updated_at = new Date().toISOString(); const { data, error } = await sb.from('tasks').update(patch).eq('id', id).select(); if(error) throw error; return data[0]; }

function wireActions(){ document.getElementById('addTop').addEventListener('click', ()=>{
  const title = prompt('Task title'); if(!title) return; addTask({title,bucket:'Work',status:'Not Started',progress:0}).then(()=>render());
});
// mobile sticky actions
const mobileNew = document.getElementById('mobileNew'); if(mobileNew){ mobileNew.addEventListener('click', ()=>{ document.getElementById('addTop').click(); }); }
const mobileMC = document.getElementById('mobileMC'); if(mobileMC){ mobileMC.addEventListener('click', ()=>{ const rp=document.getElementById('rightPanel'); if(rp){ rp.scrollIntoView({behavior:'smooth'}); } }); }
const mobileBuckets = document.getElementById('mobileBuckets'); if(mobileBuckets){ mobileBuckets.addEventListener('click', ()=>{ const bb=document.getElementById('bottomBuckets'); if(bb){ bb.style.display = (bb.style.display==='flex') ? 'none' : 'flex'; } }); }
 document.getElementById('taskList').addEventListener('click', async (ev)=>{
   const btn = ev.target.closest('button'); if(!btn) return; const id = btn.dataset.id; const action = btn.dataset.action;
   if(action === 'done'){
     await updateTask(id,{status:'Completed',progress:100}); render();
   } else if(action === 'note'){
     const note = prompt('Add / edit note'); if(note !== null){ await updateTask(id,{notes:note}); render(); }
   } else if(action === 'move'){
     // open quick status chooser
     const newStatus = prompt('Change status (Active / Blocked / On Ice / Future Ideas / Completed)', 'Active'); if(newStatus){ await updateTask(id,{status:newStatus}); render(); }
   }
 });
}

async function initApp(){ const ud = await sb.auth.getUser(); const user = ud && ud.data && ud.data.user ? ud.data.user : null; if(!user){ // no signed-in user, show auth UI
  document.getElementById('authArea').style.display='block';
  document.getElementById('appArea').style.display='none';
  showAuth();
  return;
}
  document.getElementById('authArea').style.display='none'; document.getElementById('appArea').style.display='block'; wireActions(); await render(); }

// startup
showAuth();
// If already signed in (rare), initialize
sb.auth.onAuthStateChange((event, session)=>{ if(session && session.user) initApp(); });
