import { f, createForm } from './node_modules/@binaryjack/formular.dev/dist/formular-dev.es.js';

async function run() {
  const schema = f.object({
    label: f.string()
  });

  const form = await createForm({
    id: 'test',
    schema,
    defaultValues: { label: 'default' }
  });

  console.log('Init getData():', form.getData());
  
  form.updateField('label', 'my absolutely new string');
  console.log('After update getData():', form.getData());
}

run().catch(console.error);
