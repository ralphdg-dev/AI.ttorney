import React from 'react';

/**
 * Reusable data table
 * Props:
 * - columns: Array<{ key: string, header: string, headerClassName?: string, cellClassName?: string, render?: (row) => ReactNode, align?: 'left'|'right'|'center' }>
 * - data: any[]
 * - keyField?: string (defaults to 'id'); if absent, uses index
 * - rowKey?: (row, index) => string
 * - dense?: boolean (smaller paddings)
 * - emptyMessage?: string
 */
const DataTable = ({ columns = [], data = [], keyField = 'id', rowKey, dense = true, emptyMessage = 'No records found.' }) => {
  const cellPad = dense ? 'px-4 py-2' : 'px-6 py-3';
  const headerText = 'text-[10px] font-medium text-gray-500 tracking-wide';
  const cellText = 'text-[11px] text-gray-700';

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${cellPad} ${headerText} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${col.headerClassName || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 && (
              <tr>
                <td colSpan={columns.length} className={`${cellPad} text-center text-[11px] text-gray-500`}>
                  {emptyMessage}
                </td>
              </tr>
            )}
            {data.map((row, index) => (
              <tr key={rowKey ? rowKey(row, index) : row[keyField] ?? index} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${cellPad} ${cellText} ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''} ${col.cellClassName || ''}`}
                  >
                    {col.render ? col.render(row, index) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
