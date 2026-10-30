import { createFileRoute, Link } from "@tanstack/react-router";
import { Shell } from "@/components/Shell";
export const Route=createFileRoute("/beta")({component:Beta,head:()=>({meta:[{title:"Закрытое тестирование — ZAPRUDA"}]})});
const tasks=[
 ["Авторизация","Зарегистрируйся, подтверди email, выйди и войди снова."],
 ["Профиль","Проверь отображение профиля и редактирование данных."],
 ["Карта и рыбалка","Запусти таймер, поставь паузу, закончи тестовую сессию. Проверь карту и GPS-разрешения."],
 ["Дневник","Сохрани результат, измени описание, удали тестовую запись."],
 ["Глубины и точки","Добавь тестовый приватный замер или отметку, проверь изменение и удаление."],
 ["Сообщество","Посмотри ленту, чат, отчёты и мобильное меню."]
] as const;
function Beta(){return <Shell>
 <section className="rounded-3xl border border-[#D7FF35]/25 bg-[#151915] p-6 sm:p-9">
 <p className="text-xs font-bold uppercase tracking-[.18em] text-[#D7FF35]">ZAPRUDA / PRIVATE BETA</p>
 <h1 className="mt-3 text-3xl font-black">Тестирование ZAPRUDA</h1>
 <p className="mt-3 max-w-3xl text-zinc-300">Помоги проверить приложение перед запуском. Тестируем на телефоне и компьютере, сообщаем об ошибках и идеях. Это предварительная версия: возможны сбои и потеря локальных GPS-данных.</p>
 <div className="mt-5 flex flex-wrap gap-3"><Link className="btn-primary" to="/feedback">Отправить отзыв или ошибку</Link><Link className="btn-ghost" to="/fishing-map">Открыть карту и трекер</Link></div>
 </section>
 <section className="panel mt-6 p-5 sm:p-7">
 <h2 className="text-xl font-bold">Что проверить</h2>
 <p className="mt-2 text-sm text-zinc-400">Пожалуйста, не добавляй реальные секретные точки и не совершай платежи. Для экспериментов используй тестовые записи и помечай их словом «ТЕСТ».</p>
 <div className="mt-5 grid gap-3 sm:grid-cols-2">{tasks.map(([name,description],i)=><div className="rounded-xl border border-white/10 bg-black/20 p-4" key={name}><p className="font-bold"><span className="mr-2 text-[#D7FF35]">{i+1}.</span>{name}</p><p className="mt-2 text-sm text-zinc-400">{description}</p></div>)}</div>
 </section>
 <section className="panel mt-6 p-5 sm:p-7"><h2 className="text-xl font-bold">Как отправить обратную связь</h2>
 <p className="mt-2 text-sm text-zinc-300">Открой форму и выбери «Сообщить об ошибке» или «Предложить улучшение». Укажи устройство, браузер, адрес страницы, что нажимал, ожидаемое поведение и что получилось. Не отправляй пароли, ключи и точные координаты секретных мест.</p>
 <Link className="btn-primary mt-4 inline-flex" to="/feedback">Форма обратной связи</Link>
 </section>
 </Shell>}
