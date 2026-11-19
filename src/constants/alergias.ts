// Opções do popup de alergias. O id é o que fica salvo; o rótulo pode mudar
export type GrupoAlergias = {
  titulo: string;
  itens: { id: string; rotulo: string }[];
};

export const gruposDeAlergias: GrupoAlergias[] = [
  {
    titulo: 'Animais',
    itens: [
      { id: 'abelhas-vespas', rotulo: 'Abelhas e vespas' },
      { id: 'formigas', rotulo: 'Formigas' },
      { id: 'acaros', rotulo: 'Ácaros' },
      { id: 'baratas', rotulo: 'Baratas' },
      { id: 'pelos-animais', rotulo: 'Pelos de animais' },
      { id: 'veneno-aranhas', rotulo: 'Veneno de aranhas' },
    ],
  },
  {
    titulo: 'Plantas',
    itens: [
      { id: 'polen-arvores', rotulo: 'Pólen de árvores' },
      { id: 'polen-gramineas', rotulo: 'Pólen de gramíneas' },
      { id: 'urtiga', rotulo: 'Urtiga' },
      { id: 'latex', rotulo: 'Látex natural' },
      { id: 'seiva', rotulo: 'Seiva de plantas' },
    ],
  },
  {
    titulo: 'Fungos e cogumelos',
    itens: [
      { id: 'esporos-fungos', rotulo: 'Esporos de fungos' },
      { id: 'alternaria', rotulo: 'Alternaria' },
      { id: 'aspergillus', rotulo: 'Aspergillus' },
      { id: 'cladosporium', rotulo: 'Cladosporium' },
      { id: 'penicillium', rotulo: 'Penicillium' },
    ],
  },
  {
    titulo: 'Outros alérgenos ambientais',
    itens: [
      { id: 'mofo', rotulo: 'Mofo' },
      { id: 'poeira-organica', rotulo: 'Poeira orgânica' },
      { id: 'picadas-insetos', rotulo: 'Picadas de insetos' },
    ],
  },
];
