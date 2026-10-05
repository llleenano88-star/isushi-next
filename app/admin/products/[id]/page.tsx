import { notFound } from 'next/navigation';
import ProductForm from '@/components/ProductForm';
import { supabaseSession } from '@/lib/supabase/ssr';
import { saveProduct } from '../../actions';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; const sb = await supabaseSession();
  const { data: categories } = await sb.from('categories').select('id,name').order('sort_order');
  let product = {};
  if (id !== 'new') {
    const { data } = await sb.from('products').select('id,iiko_id,name,description,category_id,image_url,is_new,variants').eq('id', id).maybeSingle();
    if (!data) notFound(); product = data;
  }
  return <ProductForm product={product} categories={categories ?? []} action={saveProduct} />;
}
