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

async function render(){ const tasks = await fetchTasks(); const list = document.getElementById('taskList'); list.innerHTML=''; if(!tasks.length) return list.innerHTML='<div class="small-muted">No tasks</div>';
  for(const t of tasks){ const el=document.createElement('div'); el.className='task-card'; // use CSS for spacing
    const shortNotes = t.notes ? (t.notes.length>80? escapeHtml(t.notes.slice(0,80)) + '…' : escapeHtml(t.notes)) : '';
    el.innerHTML = `
      <div style="flex:1;min-width:0">
        <div style="font-weight:700">${escapeHtml(t.title)}</div>
        <div class="small-muted" style="font-size:13px;margin-top:6px">${escapeHtml(t.bucket||'Work')} • ${escapeHtml(t.status||'Not Started')} • Due: ${escapeHtml(t.due||'—')}</div>
        ${ shortNotes ? `<div style="margin-top:8px;color:var(--muted);font-size:13px">${shortNotes}</div>` : '' }
      </div>
      <div style="margin-left:12px;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div class="card-actions"><button class="action-btn" data-action="note" data-id="${t.id}">Note</button> <button class="action-btn" data-action="move" data-id="${t.id}">Move</button></div>
        <button class="action-btn primary" data-action="done" data-id="${t.id}">Done</button>
      </div>`;
    list.appendChild(el);
  }
}

async function addTask(payload){ const { data, error } = await sb.from('tasks').insert([payload]).select(); if(error) throw error; return data[0]; }
async function updateTask(id, patch){ patch.updated_at = new Date().toISOString(); const { data, error } = await sb.from('tasks').update(patch).eq('id', id).select(); if(error) throw error; return data[0]; }

function wireActions(){ document.getElementById('addTop').addEventListener('click', ()=>{
  const title = prompt('Task title'); if(!title) return; addTask({title,bucket:'Work',status:'Not Started',progress:0}).then(()=>render());
});
 document.getElementById('taskList').addEventListener('click', async (ev)=>{
   const btn = ev.target.closest('button'); if(!btn) return; const id = btn.dataset.id; if(btn.classList.contains('done')){ await updateTask(id,{status:'Completed',progress:100}); render(); } if(btn.classList.contains('edit')){ const newTitle = prompt('Edit title'); if(newTitle) { await updateTask(id,{title:newTitle}); render(); } }
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
