import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';

const formatDate=(value)=>new Date(value).toLocaleString('es-CR',{timeZone:'America/Costa_Rica',dateStyle:'medium',timeStyle:'short'});
const dateCR=(value)=>new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Costa_Rica'});
const areas=['Todas','Baños','Cocina','Mesas'];

function AdminPanel({supabase}){
  const [user,setUser]=useState(null);
  const [authorized,setAuthorized]=useState(false);
  const [loading,setLoading]=useState(true);
  const [pending,setPending]=useState(false);
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [message,setMessage]=useState('');
  const [records,setRecords]=useState([]);
  const [workers,setWorkers]=useState([]);
  const [area,setArea]=useState('Todas');
  const [employee,setEmployee]=useState('Todas');
  const [dateFrom,setDateFrom]=useState('');
  const [dateTo,setDateTo]=useState('');
  const [selectedRecord,setSelectedRecord]=useState(null);
  const [recordDetail,setRecordDetail]=useState(null);
  const [newEmployee,setNewEmployee]=useState('');
  const [section,setSection]=useState('historial');

  const checkAdmin=useCallback(async(uid)=>{
    const {data,error}=await supabase.from('admin_users').select('user_id').eq('user_id',uid).maybeSingle();
    if(error)throw error;
    return !!data;
  },[supabase]);
  useEffect(()=>{
    let live=true;
    if(!supabase){setMessage('No existe conexión con Supabase.');setLoading(false);return;}
    const load=async()=>{
      try{
        const {data:{user:current},error}=await supabase.auth.getUser();
        if(error)throw error;
        const ok=current?await checkAdmin(current.id):false;
        if(live){setUser(current);setAuthorized(ok);}
      }catch(err){if(live)setMessage(err.message);}
      finally{if(live)setLoading(false);}
    };
    load();
    const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{
      // Check the actual user on the next microtask, not within the auth callback.
      Promise.resolve().then(load);
    });
    return()=>{live=false;subscription.unsubscribe();};
  },[supabase,checkAdmin]);

  const reload=useCallback(async()=>{
    if(!authorized)return;
    setPending(true);setMessage('');
    try{
      const [r,w]=await Promise.all([
        supabase.from('cleaning_records').select('id,area,employee_name,created_at').order('created_at',{ascending:false}).limit(500),
        supabase.from('employees').select('id,name,active').order('name')
      ]);
      if(r.error)throw r.error;if(w.error)throw w.error;
      setRecords(r.data||[]);setWorkers(w.data||[]);
    }catch(e){setMessage('No se pudo cargar el panel: '+e.message)}
    finally{setPending(false);}
  },[supabase,authorized]);
  useEffect(()=>{if(authorized)reload();else{setRecords([]);setWorkers([]);setRecordDetail(null)}},[authorized,reload]);

  const filtered=useMemo(()=>records.filter(r=>{
    const day=dateCR(r.created_at);
    return (area==='Todas'||r.area===area)&&(employee==='Todas'||r.employee_name===employee)
       &&(!dateFrom||day>=dateFrom)&&(!dateTo||day<=dateTo);
  }),[records,area,employee,dateFrom,dateTo]);

  async function login(e){
    e.preventDefault();setPending(true);setMessage('');
    try{
      const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
      if(error)throw error;
      if(!data.user||!(await checkAdmin(data.user.id))){
        await supabase.auth.signOut();
        throw new Error('Esta cuenta no tiene permiso de administración.');
      }
      setUser(data.user);setAuthorized(true);setPassword('');
    }catch(err){setMessage(err.message)}
    finally{setPending(false);}
  }
  async function logout(){await supabase.auth.signOut();setUser(null);setAuthorized(false);setSection('historial');setSelectedRecord(null);setRecordDetail(null);}
  async function showRecord(record){
    setSelectedRecord(record);setRecordDetail(null);setMessage('');setPending(true);
    try{
      const [t,s]=await Promise.all([
        supabase.from('cleaning_record_items').select('task').eq('record_id',record.id).order('task'),
        supabase.from('cleaning_signatures').select('signature_data').eq('record_id',record.id).maybeSingle()
      ]);
      if(t.error)throw t.error;if(s.error)throw s.error;
      setRecordDetail({items:t.data||[],signature:s.data?.signature_data||null});
    }catch(err){setMessage('No se pudo cargar el detalle: '+err.message)}
    finally{setPending(false);}
  }
  async function addWorker(e){
    e.preventDefault();const name=newEmployee.trim().replace(/\s+/g,' ');
    if(name.length<3){setMessage('Ingresá un nombre válido.');return}
    setPending(true);setMessage('');
    const {error}=await supabase.from('employees').insert({name,active:true});
    if(error)setMessage('No se pudo agregar: '+error.message);else{setNewEmployee('');await reload();setMessage('Colaborador agregado.');}
    setPending(false);
  }
  async function toggleWorker(w){
    setPending(true);setMessage('');
    const {error}=await supabase.from('employees').update({active:!w.active}).eq('id',w.id);
    if(error)setMessage('No se pudo actualizar: '+error.message);else await reload();
    setPending(false);
  }
  function downloadPdf(){
    if(!selectedRecord||!recordDetail)return;
    const doc=new jsPDF({unit:'mm',format:'a4'});
    const printable=(text)=>String(text).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const x=18;
    doc.setFillColor(158,27,32);doc.rect(0,0,210,35,'F');
    doc.setTextColor(255,255,255);doc.setFontSize(18);doc.text('POLLOS KAREN',x,17);doc.setFontSize(11);doc.text('Constancia de limpieza y desinfeccion',x,26);
    doc.setTextColor(35,40,48);doc.setFontSize(11);
    let y=48;
    const line=(title,value)=>{doc.setFont('helvetica','bold');doc.text(title,x,y);doc.setFont('helvetica','normal');doc.text(printable(value),x+43,y);y+=9;};
    line('Area:',selectedRecord.area);line('Colaborador:',selectedRecord.employee_name);line('Fecha:',formatDate(selectedRecord.created_at));line('Registro:',selectedRecord.id);
    y+=8;doc.setFont('helvetica','bold');doc.text('Actividades registradas',x,y);y+=8;doc.setFont('helvetica','normal');
    (recordDetail.items||[]).forEach((item,i)=>{const wrapped=doc.splitTextToSize(printable((i+1)+'. '+item.task),171);doc.text(wrapped,x,y);y+=wrapped.length*6+2});
    y+=10;doc.setFont('helvetica','bold');doc.text('Firma del colaborador',x,y);y+=5;
    if(recordDetail.signature?.startsWith('data:image/png;base64,')){try{doc.addImage(recordDetail.signature,'PNG',x,y,85,39)}catch(e){doc.setFont('helvetica','normal');doc.text('No se pudo insertar la imagen de la firma.',x,y+8)}}
    else {doc.setFont('helvetica','normal');doc.text('Firma no disponible.',x,y+8)}
    doc.setFontSize(8);doc.setTextColor(110,110,110);doc.text('Constancia operativa: la firma no verifica por si misma la identidad.',x,280);
    doc.save('limpieza-'+selectedRecord.area.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')+'-'+selectedRecord.id.slice(0,8)+'.pdf');
  }

  if(loading)return <section><h2>Acceso administrativo</h2><p className="hint">Verificando sesión…</p></section>;
  if(!authorized)return <section className="admin-login"><h2>Acceso administrativo</h2><p className="hint">El personal puede registrar limpiezas sin iniciar sesión. Para consultar firmas e historial se requiere una cuenta autorizada.</p><form onSubmit={login} className="stack"><label>Correo administrativo<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} autoComplete="username" placeholder="correo@ejemplo.com"/></label><label>Contraseña<input type="password" required value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Contraseña"/></label><button className="submit" disabled={pending}>{pending?'Ingresando…':'Ingresar al panel'}</button></form>{message&&<p role="alert" className="notice">{message}</p>}<p className="hint">La primera cuenta debe crearse en Supabase Auth y autorizarse en la tabla <code>admin_users</code>.</p></section>;

  return <div className="admin-panel">
    <section><div className="admin-heading"><div><h2>Panel administrativo</h2><p className="hint">Sesión autorizada: {user?.email}</p></div><button type="button" className="outline" onClick={logout}>Cerrar sesión</button></div><div className="admin-tabs"><button type="button" className={section==='historial'?'active':''} onClick={()=>setSection('historial')}>Historial</button><button type="button" className={section==='personal'?'active':''} onClick={()=>setSection('personal')}>Personal</button></div></section>
    {message&&<section><p className="notice" role="status">{message}</p></section>}
    {section==='historial'?<>
      <section><div className="admin-heading"><h2>Registros de limpieza</h2><button type="button" className="outline" disabled={pending} onClick={reload}>Actualizar</button></div><div className="metrics"><div><strong>{filtered.length}</strong><span>Registros mostrados</span></div><div><strong>{new Set(filtered.map(r=>r.employee_name)).size}</strong><span>Colaboradores</span></div></div><div className="filters"><label>Área<select value={area} onChange={e=>setArea(e.target.value)}>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Colaborador<select value={employee} onChange={e=>setEmployee(e.target.value)}><option>Todas</option>{[...new Set(records.map(r=>r.employee_name))].sort().map(n=><option key={n}>{n}</option>)}</select></label><label>Desde<input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/></label><label>Hasta<input type="date" value={dateTo} min={dateFrom||undefined} onChange={e=>setDateTo(e.target.value)}/></label></div><p className="hint">Se cargan hasta los últimos 500 registros. Aplicá filtros para revisarlos.</p></section>
      <section><h2>Historial</h2>{filtered.length===0?<p className="hint">No hay registros para esos filtros.</p>:<div className="record-list">{filtered.map(r=><button key={r.id} type="button" className={'record-row '+(selectedRecord?.id===r.id?'selected':'')} onClick={()=>showRecord(r)}><span><strong>{r.area}</strong><small>{r.employee_name}</small></span><span><small>{formatDate(r.created_at)}</small><b>Ver detalle →</b></span></button>)}</div>}</section>
      {selectedRecord&&<section className="detail"><div className="admin-heading"><h2>Detalle de limpieza</h2><button className="outline" type="button" onClick={()=>{setSelectedRecord(null);setRecordDetail(null)}}>Cerrar</button></div><p><strong>{selectedRecord.area}</strong> · {selectedRecord.employee_name}</p><p className="hint">{formatDate(selectedRecord.created_at)} · ID: {selectedRecord.id}</p>{recordDetail?<><h3>Actividades realizadas</h3><ul className="admin-task-list">{recordDetail.items.map((x,i)=><li key={i}>{x.task}</li>)}</ul><h3>Firma registrada</h3>{recordDetail.signature?<img className="saved-signature" src={recordDetail.signature} alt={'Firma registrada por '+selectedRecord.employee_name}/>:<p className="hint">Firma no disponible.</p>}<button type="button" className="submit" onClick={downloadPdf}>Descargar constancia PDF</button></>:<p className="hint">Cargando actividades y firma…</p>}</section>}
    </>:<><section><h2>Agregar colaborador</h2><form className="employee-form" onSubmit={addWorker}><input type="text" required minLength={3} placeholder="Nombre completo" value={newEmployee} onChange={e=>setNewEmployee(e.target.value)}/><button type="submit" className="submit" disabled={pending}>Agregar</button></form></section><section><h2>Colaboradores</h2><p className="hint">Al desactivar a alguien, dejará de aparecer en el formulario, pero sus registros anteriores se conservarán.</p>{workers.map(w=><div className="worker-row" key={w.id}><div><strong>{w.name}</strong><small>{w.active?'Activo':'Inactivo'}</small></div><button className="outline" type="button" onClick={()=>toggleWorker(w)} disabled={pending}>{w.active?'Desactivar':'Activar'}</button></div>)}</section></>}
  </div>;
}
export default AdminPanel;
