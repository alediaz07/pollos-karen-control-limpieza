import React, {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import SignaturePad from 'signature_pad';
import {createClient} from '@supabase/supabase-js';
import './style.css';
import AdminPanel from './AdminPanel.jsx';

const url=import.meta.env.VITE_SUPABASE_URL;
const key=(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY);
const supabase=url&&key?createClient(url,key):null;
const fallback={Baños:['Desinfectar inodoros','Limpiar lavamanos y espejos','Limpiar pisos','Reponer jabón y papel','Vaciar basureros'],Cocina:['Desinfectar superficies','Limpiar equipos y utensilios','Limpiar pisos','Retirar residuos'],Mesas:['Limpiar y desinfectar todas las mesas','Limpiar sillas','Revisar el comedor']};
function Signature({onChange,resetKey}){
 const canvas=useRef(null),pad=useRef(null);
 useEffect(()=>{const el=canvas.current;const resize=()=>{const ratio=Math.max(window.devicePixelRatio||1,1);const old=pad.current?.toData();el.width=el.offsetWidth*ratio;el.height=el.offsetHeight*ratio;el.getContext('2d').scale(ratio,ratio);pad.current?.clear();if(old?.length)pad.current?.fromData(old);};pad.current=new SignaturePad(el,{penColor:'#18212b',minWidth:1,maxWidth:2.5});const finish=()=>onChange(!pad.current.isEmpty());pad.current.addEventListener('endStroke',finish);resize();window.addEventListener('resize',resize);return()=>{window.removeEventListener('resize',resize);pad.current?.off();};},[resetKey]);
 return <div><canvas ref={canvas} className="signature" aria-label="Área para dibujar firma"/><div className="signature-actions"><span>Firmá con el dedo o lápiz digital</span><button type="button" className="link" onClick={()=>{pad.current?.clear();onChange(false)}}>Borrar firma</button></div></div>
}
function App(){
 const [area,setArea]=useState('Baños'),[employees,setEmployees]=useState([]),[selected,setSelected]=useState(''),[checked,setChecked]=useState({}),[signed,setSigned]=useState(false),[sigKey,setSigKey]=useState(0),[status,setStatus]=useState(''),[saving,setSaving]=useState(false),[tab,setTab]=useState('registro');
 useEffect(()=>{if(!supabase)return;supabase.from('employees').select('id,name').eq('active',true).order('name').then(({data,error})=>{if(error)setStatus(error.message);else setEmployees(data||[])});},[]);
 const tasks=fallback[area];const selectedTasks=tasks.filter(t=>Boolean(checked[t]));const hasChecked=selectedTasks.length>0;
 async function save(e){e.preventDefault();if(!supabase){setStatus('Configurá Supabase en el archivo .env para guardar registros.');return;}if(!selected||!hasChecked||!signed){setStatus('Seleccioná al menos una actividad, elegí tu nombre y firmá.');return;}
 const canvas=document.querySelector('canvas.signature');if(!canvas)return;
 setSaving(true);setStatus('Guardando registro…');
 try{const signature=canvas.toDataURL('image/png');const {data,error}=await supabase.functions.invoke('submit-cleaning',{body:{area,employeeId:selected,tasks:selectedTasks,signature}});if(error)throw error;if(!data?.id)throw new Error(data?.error||'Respuesta de guardado inválida');setStatus('Limpieza registrada correctamente. Código: '+data.id);setChecked({});setSelected('');setSigned(false);setSigKey(k=>k+1);}catch(err){setStatus('No se pudo guardar: '+err.message)}finally{setSaving(false)}
 }
 return <main className="shell"><header><div className="eyebrow">POLLOS KAREN</div><h1>Control de Limpieza</h1><p>Registro de limpieza y desinfección</p></header><nav><button className={tab==='registro'?'active':''} onClick={()=>setTab('registro')}>Nuevo registro</button><button className={tab==='administracion'?'active':''} onClick={()=>setTab('administracion')}>Administración</button></nav>{tab==='registro'?<form onSubmit={save}><section><h2>1. Seleccioná el área</h2><div className="areas">{Object.keys(fallback).map(a=><button type="button" key={a} className={area===a?'chosen':''} onClick={()=>{setArea(a);setChecked({});setSigned(false);setSigKey(k=>k+1);setStatus('')}}>{a}</button>)}</div></section><section><h2>2. Confirmá la limpieza</h2><p className="hint">Marcá únicamente las actividades que realizaste. Podés registrar una o varias sin tener que marcar todas.</p><p className="hint" aria-live="polite">{selectedTasks.length} de {tasks.length} actividades seleccionadas</p>{tasks.map(t=><label className="task" key={t}><input type="checkbox" checked={!!checked[t]} onChange={e=>setChecked(s=>({...s,[t]:e.target.checked}))}/><span>{t}</span></label>)}</section><section><h2>3. Seleccioná tu nombre</h2><select value={selected} onChange={e=>setSelected(e.target.value)} required><option value="">Seleccionar colaborador</option>{employees.map(p=><option value={p.id} key={p.id}>{p.name}</option>)}</select>{!supabase&&<p className="hint">Modo inicial: falta configurar la conexión con Supabase.</p>}</section><section><h2>4. Firma manuscrita</h2><Signature key={sigKey} resetKey={sigKey} onChange={setSigned}/><p className="hint">La firma queda asociada a este registro. No constituye una verificación independiente de identidad.</p></section><button className="submit" type="submit" disabled={saving||!hasChecked||!selected||!signed}>{saving?'Guardando…':'Guardar limpieza firmada'}</button>{status&&<p className="notice" role="status">{status}</p>}</form>:<AdminPanel supabase={supabase}/>}<footer>Pollos Karen · Bitácora digital de limpieza</footer></main>
}
createRoot(document.getElementById('root')).render(<App/>);
