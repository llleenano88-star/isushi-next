import Checkout from '@/components/Checkout';
export const metadata = { title: 'Оформление заказа — iSushiClub' };
export default function CheckoutPage() {
  return (
    <div className="py-6">
      <div className="mb-6 text-center">
        <h1 className="font-display text-4xl font-extrabold text-accent sm:text-5xl">Корзина и оформление</h1>
        <p className="mt-1 text-sm text-mute">Проверьте заказ и укажите, куда его привезти</p>
      </div>
      <Checkout />
    </div>
  );
}
