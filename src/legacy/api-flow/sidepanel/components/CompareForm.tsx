import type { TaskType } from '../../providers/base';

const TASK_TYPES: TaskType[] = ['rewrite', 'summarize', 'explain', 'brainstorm', 'research'];

type Props = {
  taskType: TaskType;
  instruction: string;
  compareDisabled: boolean;
  loading: boolean;
  onTaskTypeChange: (value: TaskType) => void;
  onInstructionChange: (value: string) => void;
  onCompare: () => void;
};

export function CompareForm(props: Props) {
  return (
    <section style={{ marginTop: 16 }}>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Task type
        <select
          value={props.taskType}
          onChange={(e) => props.onTaskTypeChange(e.target.value as TaskType)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        >
          {TASK_TYPES.map((task) => (
            <option key={task} value={task}>
              {task}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: 'block', marginBottom: 8 }}>
        Instruction
        <textarea
          value={props.instruction}
          onChange={(e) => props.onInstructionChange(e.target.value)}
          rows={4}
          placeholder="Optional instruction"
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>

      <button style={{ width: '100%', padding: 10 }} disabled={props.compareDisabled || props.loading} onClick={props.onCompare}>
        {props.loading ? 'Comparing…' : 'Compare'}
      </button>
    </section>
  );
}