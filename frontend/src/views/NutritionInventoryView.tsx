import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { InventoryItem, MealDelivery, Patient } from '../types';
import {
  Apple, Package, AlertTriangle, ShieldCheck, CheckCircle2,
  Plus, ArrowDownRight, ArrowUpRight, Search, Clock, ShieldAlert,
  X, Filter, Calendar, BarChart3
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid
} from 'recharts';

export const NutritionInventoryView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'nutrition' | 'inventory'>('nutrition');

  // Nutrition State
  const [mealDeliveries, setMealDeliveries] = useState<MealDelivery[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<MealDelivery | null>(null);
  const [simulatedMealItems, setSimulatedMealItems] = useState('Steamed vegetables and brown rice');
  const [deliveryResult, setDeliveryResult] = useState<{ status: string; message: string } | null>(null);

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Stock Transaction Modal State
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [txType, setTxType] = useState<'Receipt' | 'Issue'>('Receipt');
  const [txQuantity, setTxQuantity] = useState<number>(10);
  const [txReference, setTxReference] = useState<string>('PO-2026-999');
  const [txNotes, setTxNotes] = useState<string>('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  const loadData = async () => {
    try {
      const [meals, pts, inv, alerts] = await Promise.all([
        api.getMealDeliveries(),
        api.getPatients(),
        api.getInventoryItems(),
        api.getInventoryAlerts().catch(() => null),
      ]);
      setMealDeliveries(meals || []);
      setPatients(pts || []);
      setInventoryItems(inv || []);
      setInventoryAlerts(alerts);
    } catch (err) {
      console.error('Failed to load nutrition and inventory data', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleVerifyAndDeliver = async (deliveryId: string) => {
    setDeliveryResult(null);
    try {
      const res = await api.verifyAndDeliverMeal(deliveryId, 'Dietary Aide Anita', simulatedMealItems);
      if (res.delivery_status === 'Conflict Blocked') {
        setDeliveryResult({
          status: 'blocked',
          message: res.conflict_details || 'CRITICAL SAFETY INTERCEPT: Allergen or NPO conflict detected!',
        });
      } else {
        setDeliveryResult({
          status: 'success',
          message: 'Bedside safety check passed: Meal delivered successfully!',
        });
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Delivery verification failed');
    }
  };

  const handleOpenStockModal = (item: InventoryItem, defaultType: 'Receipt' | 'Issue') => {
    setSelectedItem(item);
    setTxType(defaultType);
    setTxQuantity(10);
    setTxReference(defaultType === 'Receipt' ? 'PO-2026-AUTO' : 'WARD-DISP-01');
    setTxNotes('');
    setIsStockModalOpen(true);
  };

  const handleConfirmStockTx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    setIsSubmittingTx(true);
    try {
      await api.recordStockTransaction({
        item_id: selectedItem.id,
        transaction_type: txType,
        quantity: Number(txQuantity),
        reference_id: txReference,
        actor: 'Pharmacy Inventory Tech',
        notes: txNotes,
      });
      setIsStockModalOpen(false);
      await loadData();
      alert(`Stock ${txType} of ${txQuantity} ${selectedItem.unit} recorded successfully!`);
    } catch (err: any) {
      alert(err.message || 'Stock transaction failed');
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const filteredItems = inventoryItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-[#2A161B]">
      {/* Workspace Header */}
      <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
              <Apple className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#7F011F] tracking-tight">Nutrition & Medical Supply Inventory</h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F5EBD0] text-[#7F011F] border border-[#E8DBC0]">
              Hospital Operations
            </span>
          </div>
          <p className="text-xs text-[#6B5B5E]">
            Bedside meal allergen interceptor & pharmacy supply inventory with expiration alerts
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center gap-2 bg-[#FAF6EC] p-1 rounded-xl border border-[#E8DBC0]">
          <button
            onClick={() => setActiveTab('nutrition')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'nutrition'
                ? 'bg-[#7F011F] text-[#F5EBD0] shadow-sm'
                : 'text-[#6B5B5E] hover:text-[#2A161B]'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            Diet & Meal Deliveries
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'inventory'
                ? 'bg-[#7F011F] text-[#F5EBD0] shadow-sm'
                : 'text-[#6B5B5E] hover:text-[#2A161B]'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            Pharmacy & Supplies ({inventoryAlerts?.low_stock_count || 0} Alerts)
          </button>
        </div>
      </div>

      {/* 1. NUTRITION & MEAL DELIVERIES TAB */}
      {activeTab === 'nutrition' && (
        <div className="space-y-6">
          {/* Bedside Allergen Conflict Simulator Panel */}
          <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  Bedside Allergen & Feeding Restriction Interceptor Simulator
                </h3>
                <p className="text-xs text-[#6B5B5E]">
                  Cross-references meal item descriptions against the patient's recorded allergies and NPO fasting status
                </p>
              </div>
              <span className="text-[10px] font-mono bg-[#FAF0F2] text-[#7F011F] px-2 py-0.5 rounded border border-[#7F011F]/20">
                Safety Rule Active
              </span>
            </div>

            {deliveryResult && (
              <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
                deliveryResult.status === 'blocked'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {deliveryResult.status === 'blocked' ? (
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                )}
                <div>
                  <span className="font-bold block text-sm">
                    {deliveryResult.status === 'blocked' ? 'DELIVERY BLOCKED BY SAFETY INTERCEPTOR' : 'DELIVERY VERIFIED SAFE'}
                  </span>
                  <span>{deliveryResult.message}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-[#2A161B] block">
                  Simulate Meal Tray Contents (Test Safety Intercept):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={simulatedMealItems}
                    onChange={(e) => setSimulatedMealItems(e.target.value)}
                    placeholder="e.g. Steamed vegetables with peanut dressing, whole milk, chicken broth..."
                    className="flex-1 bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                  />
                  <button
                    type="button"
                    onClick={() => setSimulatedMealItems('Thai noodles with crushed peanuts')}
                    className="px-2.5 py-2 bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/30 hover:bg-[#F5EBD0] rounded-xl font-medium shrink-0"
                  >
                    Test Peanut Alert
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimulatedMealItems('Clear apple juice and water')}
                    className="px-2.5 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-medium shrink-0"
                  >
                    Test Safe Liquid
                  </button>
                </div>
              </div>

              <div className="bg-[#FAF6EC] p-3 rounded-xl border border-[#E8DBC0] space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#7F011F] block">Zero Harm Protocol</span>
                <p className="text-[11px] text-[#6B5B5E]">
                  If an item contains allergens matching the patient's record or if the patient is marked strict NPO, delivery status transitions to <strong>Conflict Blocked</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Meal Deliveries Table Card */}
          <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
              <h3 className="text-sm font-bold text-[#7F011F] flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Scheduled Ward Meal Deliveries
              </h3>
              <span className="text-xs text-[#6B5B5E]">{mealDeliveries.length} total deliveries</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DBC0] text-[#6B5B5E] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Delivery ID</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Meal Period</th>
                    <th className="py-2.5 px-3">Schedule</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Allergen Clearance</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DBC0]/60">
                  {mealDeliveries.map((m) => {
                    const isDelivered = m.delivery_status === 'Delivered';
                    const isBlocked = m.delivery_status === 'Conflict Blocked';

                    return (
                      <tr key={m.id} className="hover:bg-[#FAF6EC]/50 transition-colors">
                        <td className="py-3 px-3 font-mono text-[11px] text-[#7F011F] font-bold">{m.id}</td>
                        <td className="py-3 px-3 font-semibold text-[#2A161B]">Patient {m.patient_id}</td>
                        <td className="py-3 px-3 font-medium text-[#2A161B]">{m.meal_period}</td>
                        <td className="py-3 px-3 text-[#6B5B5E]">{m.scheduled_date} {m.scheduled_time}</td>
                        <td className="py-3 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : isBlocked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.delivery_status}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {m.allergy_check_passed ? (
                            <span className="text-emerald-700 flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Passed Safe
                            </span>
                          ) : (
                            <span className="text-rose-700 flex items-center gap-1 text-[11px] font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5" /> Conflict Triggered
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {!isDelivered ? (
                            <button
                              onClick={() => handleVerifyAndDeliver(m.id)}
                              className="px-3 py-1 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] rounded-lg font-semibold text-[11px] shadow-sm transition-all"
                            >
                              Verify & Deliver
                            </button>
                          ) : (
                            <span className="text-[11px] text-[#8C7B7E]">Delivered ({m.delivered_by || 'Staff'})</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. PHARMACY & MEDICAL INVENTORY TAB */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          {/* Inventory KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-[#6B5B5E] font-bold uppercase tracking-wider">Total Catalog Items</span>
              <div className="text-2xl font-bold text-[#2A161B] mt-1">{inventoryItems.length}</div>
              <span className="text-[11px] text-[#7F011F]">Monitored SKUs</span>
            </div>

            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-[#6B5B5E] font-bold uppercase tracking-wider">Low Stock SKUs</span>
              <div className="text-2xl font-bold text-amber-700 mt-1">{inventoryAlerts?.low_stock_count || 0}</div>
              <span className="text-[11px] text-amber-700">Below Reorder Threshold</span>
            </div>

            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-[#6B5B5E] font-bold uppercase tracking-wider">Expired Batches</span>
              <div className="text-2xl font-bold text-rose-700 mt-1">{inventoryAlerts?.expired_count || 0}</div>
              <span className="text-[11px] text-rose-700">Quarantine Required</span>
            </div>

            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] text-[#6B5B5E] font-bold uppercase tracking-wider">Expiring in 30 Days</span>
              <div className="text-2xl font-bold text-[#7F011F] mt-1">{inventoryAlerts?.expiring_soon_count || 0}</div>
              <span className="text-[11px] text-[#7F011F]">FEFO Priority Dispatch</span>
            </div>
          </div>

          {/* Stock Level vs Reorder Threshold Operational Chart (Phase 6 Requirement) */}
          {inventoryItems.length > 0 && (
            <div className="bg-white border border-[#E8DBC0] rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-[#7F011F] flex items-center gap-1.5 uppercase tracking-wide">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Stock Level vs Reorder Threshold Analysis
                  </h3>
                  <p className="text-[11px] text-[#6B5B5E]">
                    Real-time pharmacy stock comparison: Identifies active supplies approaching or below safety reorder threshold
                  </p>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FAF0F2] text-[#7F011F] border border-[#7F011F]/20">
                  FEFO Monitored
                </span>
              </div>

              <div className="h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={inventoryItems
                      .slice()
                      .sort((a, b) => (a.quantity_on_hand / Math.max(1, a.reorder_threshold)) - (b.quantity_on_hand / Math.max(1, b.reorder_threshold)))
                      .slice(0, 8)
                      .map((item) => ({
                        name: item.name.length > 16 ? item.name.slice(0, 16) + '...' : item.name,
                        Stock: item.quantity_on_hand,
                        Threshold: item.reorder_threshold,
                        unit: item.unit,
                      }))}
                    margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E8DBC0" opacity={0.6} />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B5B5E' }} interval={0} angle={-15} textAnchor="end" />
                    <YAxis tick={{ fontSize: 10, fill: '#6B5B5E' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FAF6EC',
                        color: '#2A161B',
                        borderColor: '#E8DBC0',
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="Stock" name="Stock On Hand" fill="#7F011F" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Threshold" name="Reorder Threshold" fill="#D8C59E" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Inventory Table */}
          <div className="bg-white border border-[#E8DBC0] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DBC0] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#8C7B7E]" />
                <input
                  type="text"
                  placeholder="Search item, code, location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-1.5 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                {['All', 'Medication', 'Emergency Consumable', 'Fluid & Electrolyte', 'Surgical Supply'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setSelectedCategory(c)}
                    className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                      selectedCategory === c
                        ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F]'
                        : 'bg-[#FAF6EC] text-[#6B5B5E] border-[#E8DBC0] hover:bg-[#F5EBD0]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8DBC0] text-[#6B5B5E] uppercase text-[10px]">
                    <th className="py-2.5 px-3">Item Code</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">On Hand</th>
                    <th className="py-2.5 px-3">Threshold</th>
                    <th className="py-2.5 px-3">Batch & Expiry</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DBC0]/60">
                  {filteredItems.map((item) => {
                    const isLowStock = item.quantity_on_hand <= item.reorder_threshold;

                    return (
                      <tr key={item.id} className="hover:bg-[#FAF6EC]/50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-[#7F011F]">{item.item_code}</td>
                        <td className="py-3 px-3 font-semibold text-[#2A161B]">{item.name}</td>
                        <td className="py-3 px-3 text-[#6B5B5E]">{item.category}</td>
                        <td className="py-3 px-3">
                          <span className={`font-bold ${isLowStock ? 'text-rose-700' : 'text-[#2A161B]'}`}>
                            {item.quantity_on_hand} {item.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#8C7B7E] font-mono">{item.reorder_threshold}</td>
                        <td className="py-3 px-3">
                          <span className="font-mono text-[11px] block text-[#2A161B]">{item.batch_number}</span>
                          <span className="text-[10px] text-[#6B5B5E]">{item.expiry_date}</span>
                        </td>
                        <td className="py-3 px-3 text-[#6B5B5E]">{item.location}</td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenStockModal(item, 'Receipt')}
                              className="px-2.5 py-1 bg-[#FAF6EC] hover:bg-[#F5EBD0] text-[#7F011F] border border-[#E8DBC0] rounded-lg font-semibold text-[10px]"
                            >
                              + Receive
                            </button>
                            <button
                              onClick={() => handleOpenStockModal(item, 'Issue')}
                              className="px-2.5 py-1 bg-[#7F011F] hover:bg-[#680119] text-[#F5EBD0] rounded-lg font-semibold text-[10px]"
                            >
                              - Dispense
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Stock Transaction Modal */}
      {isStockModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#E8DBC0] rounded-2xl w-full max-w-md p-6 shadow-xl space-y-4 text-[#2A161B]">
            <div className="flex items-center justify-between border-b border-[#E8DBC0] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#7F011F]">
                  Record Stock Transaction ({txType})
                </h3>
                <p className="text-xs text-[#6B5B5E]">{selectedItem.name} ({selectedItem.item_code})</p>
              </div>
              <button
                onClick={() => setIsStockModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#FAF6EC] text-[#8C7B7E]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmStockTx} className="space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#6B5B5E] mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('Receipt')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      txType === 'Receipt'
                        ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F]'
                        : 'bg-[#FAF6EC] text-[#6B5B5E] border-[#E8DBC0]'
                    }`}
                  >
                    + Stock Receipt (Add)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxType('Issue')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      txType === 'Issue'
                        ? 'bg-[#7F011F] text-[#F5EBD0] border-[#7F011F]'
                        : 'bg-[#FAF6EC] text-[#6B5B5E] border-[#E8DBC0]'
                    }`}
                  >
                    - Stock Issue (Dispense)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B5B5E] mb-1">Quantity ({selectedItem.unit})</label>
                <input
                  type="number"
                  min={1}
                  value={txQuantity}
                  onChange={(e) => setTxQuantity(Number(e.target.value))}
                  required
                  className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B5B5E] mb-1">Reference ID / PO Number</label>
                <input
                  type="text"
                  value={txReference}
                  onChange={(e) => setTxReference(e.target.value)}
                  className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#6B5B5E] mb-1">Audit Notes</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="e.g. Replenishment shipment received from central warehouse"
                  className="w-full bg-[#FAF6EC] border border-[#E8DBC0] rounded-xl px-3 py-2 text-xs text-[#2A161B] focus:outline-none focus:border-[#7F011F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DBC0]">
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="px-4 py-2 border border-[#E8DBC0] text-[#6B5B5E] rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="px-4 py-2 bg-[#7F011F] text-[#F5EBD0] hover:bg-[#680119] rounded-xl font-bold shadow-sm transition-all"
                >
                  {isSubmittingTx ? 'Recording...' : `Confirm ${txType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
