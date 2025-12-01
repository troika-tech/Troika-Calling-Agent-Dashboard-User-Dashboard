import React, { useState, useEffect } from "react";
import { FaFileDownload, FaSpinner, FaSearch } from "react-icons/fa";
import { callAPI } from "../services/api";
import { useToast } from "../context/ToastContext";

const DeliveryReports = () => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 100,
    total: 0,
    pages: 0,
  });
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState({});

  useEffect(() => {
    fetchReports();
  }, [pagination.page, pagination.limit, search]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (search) {
        params.search = search;
      }

      console.log("Fetching delivery reports with params:", params);
      const response = await callAPI.getDeliveryReports(params);
      console.log("Delivery Reports Response:", response);

      // Handle response structure: backend returns { success: true, data: { reports: [...], pagination: {...} } }
      // API service extracts response.data.data, so response should be { data: { reports: [...], pagination: {...} } }
      const reportsData = response.data || response;
      setReports(reportsData?.reports || []);
      setPagination(reportsData?.pagination || pagination);

      console.log(
        "Set reports:",
        reportsData?.reports?.length || 0,
        "Set pagination:",
        reportsData?.pagination
      );
    } catch (err) {
      console.error("Error fetching delivery reports:", err);
      console.error("Error details:", {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status,
        statusText: err.response?.statusText,
      });
      setError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Failed to load delivery reports"
      );
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (campaignId, campaignName) => {
    try {
      setDownloading((prev) => ({ ...prev, [campaignId]: true }));
      await callAPI.downloadDeliveryReport(campaignId);
    } catch (err) {
      console.error("Error downloading report:", err);
      toast.error("Failed to download report. Please try again.");
    } finally {
      setDownloading((prev) => ({ ...prev, [campaignId]: false }));
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
      active: "bg-blue-50 text-blue-700 border border-blue-200",
      paused: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      cancelled: "bg-zinc-100 text-zinc-700 border border-zinc-200",
      failed: "bg-red-50 text-red-700 border border-red-200",
      draft: "bg-gray-50 text-gray-700 border border-gray-200",
      scheduled: "bg-purple-50 text-purple-700 border border-purple-200",
      queued: "bg-orange-50 text-orange-700 border border-orange-200",
    };
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${
          styles[status] || styles.draft
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
      </span>
    );
  };

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination({ ...pagination, page: 1 });
  };

  if (loading && reports.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <FaSpinner
            className="animate-spin text-emerald-500 mx-auto mb-4"
            size={48}
          />
          <p className="text-zinc-500 text-sm">Loading delivery reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 mb-3">
            <FaFileDownload className="h-3 w-3" />
            <span>Reports</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-zinc-900">
            Delivery Reports
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            View and download detailed reports for your campaigns
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="glass-panel p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-zinc-600 whitespace-nowrap">
              Show:
            </label>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination({
                  ...pagination,
                  limit: parseInt(e.target.value),
                  page: 1,
                });
              }}
              className="px-3 py-2 text-xs border border-zinc-300 rounded-lg bg-white text-zinc-700 focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
            <span className="text-xs text-zinc-600">entries</span>
          </div>
          <div className="relative w-full sm:w-auto sm:min-w-[300px]">
            <FaSearch
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400"
              size={14}
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={search}
              onChange={handleSearch}
              className="w-full pl-9 pr-3 py-2 border border-zinc-200 rounded-lg bg-white text-zinc-900 text-xs focus:ring-2 focus:ring-emerald-500/60 focus:border-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="glass-card border-l-4 border-red-500/70 bg-red-50/80 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Reports Table */}
      <div className="glass-panel overflow-hidden relative">
        <div className="overflow-x-auto scrollbar-thin">
          {/* Container with scroll - shows 10 rows at a time (approximately 400px height) */}
          <div className="overflow-y-auto" style={{ maxHeight: "400px" }}>
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-gradient-to-r from-emerald-50/80 to-teal-50/80">
                <tr className="border-b border-zinc-200">
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Unique ID
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Campaign Name
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Total No's
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Used Credit
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-medium text-zinc-600 uppercase tracking-[0.16em] whitespace-nowrap">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <FaSpinner
                          className="animate-spin text-emerald-500"
                          size={20}
                        />
                        <span className="text-zinc-500 text-sm">
                          Loading...
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : reports.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-4 py-8 text-center text-zinc-500 text-sm"
                    >
                      No reports found
                    </td>
                  </tr>
                ) : (
                  reports.map((report, index) => (
                    <tr
                      key={report._id || report.uniqueId}
                      className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-medium text-zinc-900 whitespace-nowrap">
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-600 whitespace-nowrap">
                        {report.uniqueId || report._id}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-700 whitespace-nowrap">
                        {report.campaignName}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 whitespace-nowrap">
                        {report.totalNumbers || 0}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-emerald-600 whitespace-nowrap">
                        {report.usedCredits?.toLocaleString() || 0}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={() =>
                            handleDownload(
                              report._id || report.uniqueId,
                              report.campaignName
                            )
                          }
                          disabled={downloading[report._id || report.uniqueId]}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {downloading[report._id || report.uniqueId] ? (
                            <>
                              <FaSpinner className="animate-spin" size={12} />
                              <span>Downloading...</span>
                            </>
                          ) : (
                            <>
                              <FaFileDownload size={12} />
                              <span>View Report</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-zinc-200 bg-zinc-50/60 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
          <div className="text-xs sm:text-sm font-medium text-zinc-600 text-center sm:text-left">
            Showing{" "}
            <span className="text-emerald-600">
              {pagination.total > 0
                ? (pagination.page - 1) * pagination.limit + 1
                : 0}
            </span>{" "}
            to{" "}
            <span className="text-emerald-600">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>{" "}
            of <span className="text-zinc-900">{pagination.total}</span> reports
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap justify-center">
              <button
                onClick={() => setPagination({ ...pagination, page: 1 })}
                disabled={pagination.page === 1 || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                First
              </button>
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.max(1, pagination.page - 1),
                  })
                }
                disabled={pagination.page === 1 || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Prev
              </button>
              <span className="px-2 sm:px-4 py-1 text-xs sm:text-sm font-medium text-zinc-700 whitespace-nowrap bg-white rounded-lg border border-zinc-300">
                Page <span className="text-emerald-600">{pagination.page}</span>{" "}
                of <span className="text-zinc-900">{pagination.pages}</span>
              </span>
              <button
                onClick={() =>
                  setPagination({
                    ...pagination,
                    page: Math.min(pagination.pages, pagination.page + 1),
                  })
                }
                disabled={pagination.page >= pagination.pages || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Next
              </button>
              <button
                onClick={() =>
                  setPagination({ ...pagination, page: pagination.pages })
                }
                disabled={pagination.page >= pagination.pages || loading}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm border border-zinc-300 rounded-lg bg-white text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
              >
                Last
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryReports;
