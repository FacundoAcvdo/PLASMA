import { createContext, useContext, useState, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-fetch';

export interface DatasetInfo {
  dataset_id: string;
  user_id: string;
  dataset_name: string;
  dataset_size: number;
  embedding_size: number;
  embedding_chunked_size: number;
}

interface DatasetContextType {
  datasetSeleccionado: string | null;
  setDatasetSeleccionado: (value: string | null) => void;
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined);

async function fetchDatasets(): Promise<DatasetInfo[]> {
  const data = await apiFetch<{ datasets: DatasetInfo[] }>(
    '/dataset/getDatasets',
    { method: 'GET' },
    { silent: true },
  );
  return data.datasets;
}

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [datasetSeleccionado, setDatasetSeleccionado] = useState<string | null>(null);

  const { data: datasets } = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
  });

  const valor: DatasetContextType = {
    datasetSeleccionado:
      datasetSeleccionado && datasets?.some((d) => d.dataset_name === datasetSeleccionado)
        ? datasetSeleccionado
        : (datasets?.[0]?.dataset_name ?? null),
    setDatasetSeleccionado,
  };

  return <DatasetContext.Provider value={valor}>{children}</DatasetContext.Provider>;
}

export function useDataset() {
  const context = useContext(DatasetContext);
  if (!context) throw new Error('useDataset debe usarse dentro de DatasetProvider');
  return context;
}

export function useDatasetsQuery() {
  return useQuery<DatasetInfo[]>({ queryKey: ['datasets'], queryFn: fetchDatasets });
}

export function useInvalidarDatasets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['datasets'] });
}
