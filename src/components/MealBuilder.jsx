import { useEffect, useMemo, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL || "";

function Input({ label, ...props }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-blue-100 mb-1">{label}</span>
      <input
        {...props}
        className={`w-full rounded-lg bg-slate-800/60 border border-blue-500/20 px-3 py-2 text-blue-100 placeholder-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${props.className || ""}`}
      />
    </label>
  );
}

function Button({ children, ...props }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

export default function MealBuilder() {
  const [foods, setFoods] = useState([]);
  const [query, setQuery] = useState("");
  const [loadingFoods, setLoadingFoods] = useState(false);

  const [items, setItems] = useState([]);
  const [mealName, setMealName] = useState("My Meal");
  const [calc, setCalc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedMeals, setSavedMeals] = useState([]);

  const filteredFoods = useMemo(() => foods, [foods]);

  const fetchFoods = async () => {
    setLoadingFoods(true);
    try {
      const res = await fetch(`${API}/foods?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFoods(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFoods(false);
    }
  };

  useEffect(() => {
    fetchFoods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addItem = (food) => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        food_id: food.id,
        food_name: food.name,
        quantity_grams: 100,
      },
    ]);
  };

  const updateItem = (id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const calculate = async () => {
    try {
      const payload = {
        items: items.map(({ food_id, quantity_grams }) => ({ food_id, quantity_grams: Number(quantity_grams) })),
      };
      const res = await fetch(`${API}/meals/calc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setCalc(data);
    } catch (e) {
      console.error(e);
    }
  };

  const saveMeal = async () => {
    setSaving(true);
    try {
      const payload = {
        name: mealName,
        items: items.map(({ food_id, quantity_grams }) => ({ food_id, quantity_grams: Number(quantity_grams) })),
      };
      const res = await fetch(`${API}/meals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      await loadSavedMeals();
      return data;
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const loadSavedMeals = async () => {
    try {
      const res = await fetch(`${API}/meals`);
      const data = await res.json();
      setSavedMeals(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadSavedMeals();
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Nutrition Planner</h1>
          <p className="text-blue-200 mt-2">Build meals and instantly see calories, protein, carbs, and fats.</p>
        </header>

        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
            <div className="flex items-end gap-3">
              <Input label="Search Foods" placeholder="e.g. chicken, rice" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button onClick={fetchFoods}>Search</Button>
            </div>
            <div className="mt-4 max-h-72 overflow-auto divide-y divide-blue-500/10">
              {loadingFoods ? (
                <div className="p-4 text-blue-200">Loading...</div>
              ) : filteredFoods.length === 0 ? (
                <div className="p-4 text-blue-200/70">No foods yet. Add some below.</div>
              ) : (
                filteredFoods.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-white font-medium">{f.name}</div>
                      <div className="text-xs text-blue-300/70">Per 100g: {f.calories_per_100g} kcal • P {f.protein_per_100g}g • C {f.carbs_per_100g}g • F {f.fat_per_100g}g</div>
                    </div>
                    <Button onClick={() => addItem(f)}>Add</Button>
                  </div>
                ))
              )}
            </div>

            <h3 className="mt-6 text-white font-semibold">Add a new food</h3>
            <AddFood onAdded={fetchFoods} />
          </div>

          <div className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
            <Input label="Meal name" value={mealName} onChange={(e) => setMealName(e.target.value)} />
            <div className="mt-4 space-y-3">
              {items.length === 0 && <div className="text-blue-200/70">No items yet. Add foods from the left.</div>}
              {items.map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-white">{it.food_name}</div>
                    <div className="text-xs text-blue-300/70">{it.food_id}</div>
                  </div>
                  <Input
                    label="Grams"
                    type="number"
                    min={1}
                    value={it.quantity_grams}
                    onChange={(e) => updateItem(it.id, { quantity_grams: e.target.value })}
                    className="w-28"
                  />
                  <Button className="bg-red-600 hover:bg-red-500" onClick={() => removeItem(it.id)}>Remove</Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-3">
              <Button onClick={calculate} disabled={items.length === 0}>Calculate</Button>
              <Button onClick={saveMeal} disabled={items.length === 0 || saving}>{saving ? "Saving..." : "Save Meal"}</Button>
            </div>

            {calc && (
              <div className="mt-6 bg-slate-900/40 border border-blue-500/20 rounded-xl p-4">
                <div className="text-white font-semibold">Totals</div>
                <div className="text-blue-200">{calc.totals.calories} kcal • P {calc.totals.protein}g • C {calc.totals.carbs}g • F {calc.totals.fat}g</div>
                <div className="mt-4 divide-y divide-blue-500/10">
                  {calc.breakdown.map((b, idx) => (
                    <div key={idx} className="py-2 text-blue-100 text-sm flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">{b.food}</div>
                        <div className="text-xs text-blue-300/70">{b.quantity_grams} g</div>
                      </div>
                      <div className="text-right text-blue-200">
                        {b.calories} kcal • P {b.protein}g • C {b.carbs}g • F {b.fat}g
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="bg-slate-800/50 border border-blue-500/20 rounded-2xl p-4">
          <h3 className="text-white font-semibold mb-3">Saved meals</h3>
          {savedMeals.length === 0 ? (
            <div className="text-blue-200/70">No meals saved yet.</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {savedMeals.map((m) => (
                <div key={m.id} className="rounded-xl border border-blue-500/20 bg-slate-900/40 p-4">
                  <div className="text-white font-semibold">{m.name}</div>
                  <div className="text-blue-200 text-sm">{m?.totals?.calories?.toFixed ? m.totals.calories.toFixed(2) : m.totals?.calories} kcal • P {m?.totals?.protein}g • C {m?.totals?.carbs}g • F {m?.totals?.fat}g</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function AddFood({ onAdded }) {
  const [form, setForm] = useState({ name: "", calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "" });
  const [adding, setAdding] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      const payload = {
        name: form.name,
        calories_per_100g: Number(form.calories_per_100g),
        protein_per_100g: Number(form.protein_per_100g),
        carbs_per_100g: Number(form.carbs_per_100g),
        fat_per_100g: Number(form.fat_per_100g || 0),
      };
      const res = await fetch(`${API}/foods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err?.detail || "Failed to add food");
      } else {
        setForm({ name: "", calories_per_100g: "", protein_per_100g: "", carbs_per_100g: "", fat_per_100g: "" });
        onAdded?.();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-3">
      <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="col-span-2 md:col-span-2" />
      <Input label="kcal/100g" type="number" step="0.1" value={form.calories_per_100g} onChange={(e) => setForm({ ...form, calories_per_100g: e.target.value })} />
      <Input label="Protein/100g" type="number" step="0.1" value={form.protein_per_100g} onChange={(e) => setForm({ ...form, protein_per_100g: e.target.value })} />
      <Input label="Carbs/100g" type="number" step="0.1" value={form.carbs_per_100g} onChange={(e) => setForm({ ...form, carbs_per_100g: e.target.value })} />
      <Input label="Fat/100g" type="number" step="0.1" value={form.fat_per_100g} onChange={(e) => setForm({ ...form, fat_per_100g: e.target.value })} />
      <Button type="submit" disabled={adding} className="col-span-2 md:col-span-1">{adding ? "Adding..." : "Add"}</Button>
    </form>
  );
}
