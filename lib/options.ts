// Выбор у товара (соус острый / не острый, выбор ролла и т.д.). Это просто общий товар с выбором, у вариантов выбора нет своих iiko-кодов.
export type OptionGroup = { title: string; choices: string[] };

// Терпимо читает options из базы: неправильные записи отбрасываются, сайт не падает
export function cleanOptions(v: unknown): OptionGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((g: any) => ({
      title: String(g?.title ?? '').trim(),
      choices: (Array.isArray(g?.choices) ? g.choices : []).map((c: unknown) => String(c ?? '').trim()).filter(Boolean),
    }))
    .filter((g) => g.choices.length > 0);
}

export const isNotSpicy = (s: string) => /^\s*не\s*остр/i.test(s);
export const isSpicy = (s: string) => !isNotSpicy(s) && /остр/i.test(s);
