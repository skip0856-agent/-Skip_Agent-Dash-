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

  document.getElementById('signin').addEventListener('click', async ()=>{
    const e=document.getElementById('email').value; const p=document.getElementById('pw').value;
    const { data, error } = await sb.auth.signInWithPassword({ email: e, password: p });
    if(error) return alert('Sign-in failed: '+error.message);
    initApp();
  });
  document.getElementById('signup').addEventListener('click', async ()=>{
    const e=document.getElementById('email').value; const p=document.getElementById('pw').value;
    const { data, error } = await sb.auth.signUp({ email: e, password: p });
    if(error) return alert('Sign-up failed: '+error.message);
    alert('Sign-up OK — check email if verification required. Then sign in.');
  });
}

async function fetchTasks(){ const { data, error } = await sb.from('tasks').select('*').order('created_at',{ascending:false}); if(error) { console.error(error); return []; } return data || []; }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

async function render(){ const tasks = await fetchTasks(); const list = document.getElementById('taskList'); list.innerHTML=''; if(!tasks.length) return list.innerHTML='<div class="small-muted">No tasks</div>';
  for(const t of tasks){ const el=document.createElement('div'); el.style.border='1px solid #e9f3f8'; el.style.padding='10px'; el.style.margin='8px 0'; el.innerHTML = `<div style="font-weight:700">${escapeHtml(t.title)}</div><div class="small-muted">${escapeHtml(t.bucket||'Work')} • ${escapeHtml(t.status||'Not Started')} • Due: ${escapeHtml(t.due||'—')}</div><div style="margin-top:6px"><button data-id="${t.id}" class="edit">Edit</button> <button data-id="${t.id}" class="done">Done</button></div>`;
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
