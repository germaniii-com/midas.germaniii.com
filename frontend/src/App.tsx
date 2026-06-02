import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/home";
import CreateBinder from "./pages/create-binder";
import BinderLayout from "./pages/binder/BinderLayout";
import AccountsPage from "./pages/binder/accounts";
import CreateAccountPage from "./pages/binder/accounts/create";
import EditAccountPage from "./pages/binder/accounts/edit";
import AccountTransactionsPage from "./pages/binder/accounts/transactions";
import TransactionsPage from "./pages/binder/transactions";
import CreateTransactionPage from "./pages/binder/transactions/create";
import EditTransactionPage from "./pages/binder/transactions/edit";
import PaymentSchedulesPage from "./pages/binder/payment-schedules";
import CreatePaymentSchedulePage from "./pages/binder/payment-schedules/create";
import EditPaymentSchedulePage from "./pages/binder/payment-schedules/edit";
import ReportsPage from "./pages/binder/reports";
import TagsPage from "./pages/binder/tags";
import CreateTagPage from "./pages/binder/tags/create";
import EditTagPage from "./pages/binder/tags/edit";
import CategoriesPage from "./pages/binder/categories";
import CreateCategoryPage from "./pages/binder/categories/create";
import EditCategoryPage from "./pages/binder/categories/edit";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create" element={<CreateBinder />} />
      <Route path="/binders/:id" element={<BinderLayout />}>
        <Route index element={<Navigate to="accounts" replace />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="accounts/create" element={<CreateAccountPage />} />
        <Route path="accounts/:accountId" element={<EditAccountPage />} />
        <Route path="accounts/:accountId/transactions" element={<AccountTransactionsPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="transactions/create" element={<CreateTransactionPage />} />
        <Route path="transactions/:transactionId" element={<EditTransactionPage />} />
        <Route path="payment-schedules" element={<PaymentSchedulesPage />} />
        <Route path="payment-schedules/create" element={<CreatePaymentSchedulePage />} />
        <Route path="payment-schedules/:scheduleId" element={<EditPaymentSchedulePage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="tags" element={<TagsPage />} />
        <Route path="tags/create" element={<CreateTagPage />} />
        <Route path="tags/:tagId" element={<EditTagPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="categories/create" element={<CreateCategoryPage />} />
        <Route path="categories/:categoryId" element={<EditCategoryPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
