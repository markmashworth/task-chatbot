import type { Settings } from '../types';
import { ACCENTS, FONTS } from '../constants';

function SegmentedControl({ value, options, onChange }: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  const idx = Math.max(0, options.indexOf(value));
  const n = options.length;
  return (
    <div className="tb-seg">
      <div
        className="tb-seg-thumb"
        style={{
          left: `calc(2px + ${idx} * (100% - 4px) / ${n})`,
          width: `calc((100% - 4px) / ${n})`,
        }}
      />
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({ settings, onChange, onClose }: {
  settings: Settings;
  onChange: (s: Partial<Settings>) => void;
  onClose: () => void;
}) {
  return (
    <div className="tb-settings-panel">
      <div className="tb-settings-header">
        <b>Settings</b>
        <button className="tb-settings-close" onClick={onClose} aria-label="Close settings">✕</button>
      </div>
      <div className="tb-settings-body">
        <div className="tb-settings-sect">Appearance</div>

        <div className="tb-settings-row">
          <div className="tb-settings-lbl">Accent</div>
          <div className="tb-color-chips">
            {(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((key) => (
              <button
                key={key}
                type="button"
                className="tb-color-chip"
                data-on={settings.accent === key ? '1' : '0'}
                style={{ background: ACCENTS[key].c }}
                title={key}
                onClick={() => onChange({ accent: key })}
                aria-label={`Accent ${key}`}
              />
            ))}
          </div>
        </div>

        <div className="tb-settings-row">
          <div className="tb-settings-lbl">Font</div>
          <select
            className="tb-select-field"
            value={settings.font}
            onChange={(e) => onChange({ font: e.target.value as Settings['font'] })}
          >
            {(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="tb-settings-row">
          <div className="tb-settings-lbl">Density</div>
          <SegmentedControl
            value={settings.density}
            options={['compact', 'comfortable']}
            onChange={(v) => onChange({ density: v as Settings['density'] })}
          />
        </div>

        <div className="tb-settings-sect">Messages</div>

        <div className="tb-settings-row tb-settings-row-h" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="tb-settings-lbl">Show timestamps</div>
          <button
            type="button"
            className="tb-toggle"
            data-on={settings.showTime ? '1' : '0'}
            role="switch"
            aria-checked={settings.showTime}
            onClick={() => onChange({ showTime: !settings.showTime })}
          >
            <i />
          </button>
        </div>
      </div>
    </div>
  );
}
