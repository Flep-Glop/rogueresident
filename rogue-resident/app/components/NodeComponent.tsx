import { Node } from '../types/map';

const nodeColors = {
  clinical: 'bg-blue-500',
  qa: 'bg-gray-600',
  educational: 'bg-green-600',
  storage: 'bg-amber-700',
  vendor: 'bg-indigo-800',
  boss: 'bg-red-600',
};

interface NodeComponentProps {
  node: Node;
  isAvailable: boolean;
  isCompleted: boolean;
  isSelected: boolean;
  onClick: () => void;
}

export default function NodeComponent({
  node,
  isAvailable,
  isCompleted,
  isSelected,
  onClick,
}: NodeComponentProps) {
  return (
    <div
      className={`
        absolute w-24 h-24 rounded-full flex items-center justify-center
        ${nodeColors[node.type]}
        ${isAvailable ? 'cursor-pointer ring-4 ring-yellow-300' : 'opacity-50'}
        ${isCompleted ? 'opacity-50' : ''}
        ${isSelected ? 'ring-4 ring-white' : ''}
      `}
      style={{
        left: `${node.position.x * 150}px`,
        top: `${node.position.y * 100}px`,
      }}
      onClick={isAvailable ? onClick : undefined}
    >
      <span className="text-white font-bold">
        {node.type.charAt(0).toUpperCase() + node.type.slice(1)}
      </span>
    </div>
  );
}