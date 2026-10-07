import {
  PieChart as RePieChart, Pie, Cell,
  BarChart as ReBarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { IC } from './Icons';

export default function Charts({ sentData, catData }) {
  return (
                  <div className="chart-grid">
                    <div className="card">
                      <div className="card-header">
                        <div className="card-header-icon" style={{ background: 'rgba(0,229,204,0.1)' }}>
                          <IC.Bar style={{ color: 'var(--cyan)' }} />
                        </div>
                        <span className="card-title">Comment Types</span>
                      </div>
                      <div className="card-body" style={{ paddingTop: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={200}>
                          <ReBarChart data={catData} layout="vertical" margin={{ left: -12, right: 8 }}>
                            <XAxis type="number" stroke="var(--text-3)" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis dataKey="name" type="category" stroke="var(--text-3)" fontSize={11} width={72} tickLine={false} axisLine={false} />
                            <Tooltip
                              cursor={{ fill: 'rgba(255,255,255,0.025)' }}
                              contentStyle={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }}
                              labelStyle={{ color: '#ebebed' }}
                            />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={13}>
                              {catData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Bar>
                          </ReBarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="card">
                      <div className="card-header">
                        <div className="card-header-icon" style={{ background: 'rgba(61,220,132,0.1)' }}>
                          <IC.Pie style={{ color: 'var(--green)' }} />
                        </div>
                        <span className="card-title">Sentiment Split</span>
                      </div>
                      <div className="card-body" style={{ paddingTop: '0.5rem' }}>
                        <ResponsiveContainer width="100%" height={200}>
                          <RePieChart>
                            <Pie data={sentData} cx="50%" cy="45%" innerRadius={46} outerRadius={70} paddingAngle={3} dataKey="value" animationBegin={0} animationDuration={800}>
                              {sentData.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip contentStyle={{ background: '#18181c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, fontSize: 12 }} />
                            <Legend verticalAlign="bottom" height={28} formatter={v => <span style={{ color: 'var(--text-3)', fontSize: '0.72rem' }}>{v}</span>} />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
  );
}
