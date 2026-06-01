import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/home";
import CreateBinder from "./pages/create-binder";
import BinderLayout from "./pages/binder/BinderLayout";
import AccountsPage from "./pages/binder/accounts";
import TransactionsPage from "./pages/binder/transactions";
import PaymentSchedulesPage from "./pages/binder/payment-schedules";
import ReportsPage from "./pages/binder/reports";
import TagsPage from "./pages/binder/tags";
import CreateTagPage from "./pages/binder/tags/create";
import EditTagPage from "./pages/binder/tags/edit";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateBinder />} />
      <Route path="/binders/:id" element={<BinderLayout />}>
        <Route index element={<Navigate to="accounts" replace />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="payment-schedules" element={<PaymentSchedulesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/create" element={<CreateTagPage />} />
        <Route path="tags/:tagId" element={<EditTagPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
