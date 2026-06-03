import { useState } from 'react';

export function useTransaction() {
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  return { selectedTransaction, setSelectedTransaction };
}
